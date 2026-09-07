// Dawn documentation extractor — see docs/documentation-standard.md
// Walks dawn/ for *.dawn.js implementations, introspects their ports from source,
// parses sidecar .dawn Meta.documentation files, cross-checks ports, and emits
// one HTML page per resource plus an index tree into docs/api/.
// Exit code 1 if any doc/implementation mismatch is found.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DAWN_DIR = path.join(ROOT, 'dawn');
const OUT_DIR = path.join(ROOT, 'docs', 'api');

const SKIP = /backup| - | - Copy|_old|\.bak/i;
// Ports provided by the runtime itself — optional in docs
const INFRASTRUCTURE_PORTS = ["in_go", "in_begin", "in_end", "in_error", "out_begin", "out_end", "out_error", "in_instanciate"];

// ── derived URI from file location ───────────────────────────────────────────
function uriOf(implPath) {
    const rel = path.relative(DAWN_DIR, implPath).replace(/\\/g, '/').replace(/\.dawn\.js$/, '');
    if (rel.startsWith('Content-Type/data/')) {
        return rel.substring('Content-Type/data/'.length).split('/').join('.');
    }
    if (rel.startsWith('Content-Type/application/')) {
        return rel.substring('Content-Type/application/'.length).split('/').join('.');
    }
    if (rel.startsWith('Scheme/')) return rel.substring('Scheme/'.length).split('/').join('.');
    return rel.split('/').join('.'); // e.g. Console
}

// ── port introspection (static: declared this.in_*/this.out_* assignments) ───
function portsOf(source) {
    const ports = [];
    const seen = new Set();
    const re = /this\.(in|out)_([A-Za-z0-9_$]+)\s*=/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        const name = m[1] + '_' + m[2];
        if (!seen.has(name)) { seen.add(name); ports.push(name); }
    }
    return ports;
}

// ── decompose a port name into parts ─────────────────────────────────────────
// in_Number_addend_$all → { dir:'in', type:'Number', name:'addend', catchall:true }
function decomposePort(port) {
    const m = port.match(/^(in|out)_(.*)$/);
    const dir = m[1];
    let rest = m[2];
    const catchall = /_\$all$/.test(rest);
    const explicit = /_\$explicit$/.test(rest);
    rest = rest.replace(/_\$all$/, '').replace(/_\$explicit$/, '');
    const ix = rest.indexOf('_');
    const type = ix === -1 ? rest : rest.substring(0, ix);
    const name = ix === -1 ? '' : rest.substring(ix + 1);
    return { dir, type, name, catchall, explicit };
}

// universal value ports of a value resource of type T — present on every value
// resource, therefore never documented (see documentation-standard.md rule 3)
const universalValuePorts = t => new Set([`in_${t}`, `in_${t}_$all`, `out_${t}`]);

// ── doc sidecar parsing ──────────────────────────────────────────────────────
// A doc file is a legal Dawn program: EVERY line is a Meta.documentation:
// resource. The extractor strips the prefix and parses the plain text.
// Returns { subject, kind, summary, body, ports:{name:desc}, examples:[{code,expected}], see, status, errors[] }
function parseDoc(docSource, file) {
    const PREFIX = 'Meta.documentation:';
    const rawLines = docSource.split(/\r?\n/);
    const errors = [];
    const lines = [];
    rawLines.forEach((l, i) => {
        if (l.trim() === '') { lines.push(''); return; }
        if (!l.startsWith(PREFIX)) {
            // Source files (define/native blocks) may share the .dawn file with
            // the documentation (the source IS the .dawn; see Phase 1.75 in
            // docs/ROADMAP.md). Non-prefixed lines are implementation — skip them.
            return;
        }
        lines.push(l.substring(PREFIX.length));
    });
    const result = { subject: null, kind: null, summary: '', body: [], ports: {}, examples: [], see: [], status: '', errors };
    if (!lines[0]) { errors.push(`${file}: empty`); return result; }
    result.subject = lines[0].trimStart();

    let section = 'body';
    let currentExample = null;
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('@')) {
            const tag = line.slice(1).split(/\s/)[0];
            if (tag === 'port') {
                const mport = line.match(/^@port\s+(\S+)\s+[—–\-:]\s*(.*)$/);
                if (!mport) errors.push(`${file}:${i + 1}: malformed @port line`);
                else result.ports[mport[1]] = mport[2].trim();
            } else if (tag === 'kind') {
                result.kind = line.slice(5).trim();
            } else if (tag === 'see') {
                result.see.push(...line.slice(4).trim().split(/\s+/).filter(Boolean));
            } else if (tag === 'status') {
                result.status = line.slice(7).trim();
            } else if (tag === 'example') {
                currentExample = { code: [], expected: null };
                result.examples.push(currentExample);
                section = 'code';
                continue;
            } else {
                errors.push(`${file}:${i + 1}: unknown @tag "${tag}"`);
            }
            if (section === 'code') { currentExample.expected = []; } // close unterminated example
            section = 'body';
            continue;
        }
        if (section === 'code') {
            if (line.trim() === '---') { currentExample.expected = []; section = 'expected'; continue; }
            currentExample.code.push(line);
            continue;
        }
        if (section === 'expected') {
            currentExample.expected.push(line);
            continue;
        }
        if (result.summary === '' && line.trim() !== '') result.summary = line.trim();
        result.body.push(line);
    }
    // tidy examples
    for (const ex of result.examples) {
        ex.code = ex.code.join('\n').replace(/\s+$/, '');
        ex.expected = ex.expected == null ? '' : ex.expected.join('\n').replace(/\s+$/, '');
    }
    // the summary is the first non-empty body line — remove it from the body
    if (result.summary) {
        const ix = result.body.findIndex(l => l.trim() !== '');
        if (ix >= 0) result.body.splice(ix, 1);
    }
    // trim leading/trailing blank body lines
    while (result.body.length && result.body[0].trim() === '') result.body.shift();
    while (result.body.length && result.body[result.body.length - 1].trim() === '') result.body.pop();
    return result;
}

// ── HTML rendering ───────────────────────────────────────────────────────────
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
body{font-family:system-ui,sans-serif;max-width:60em;margin:2em auto;padding:0 1em;line-height:1.5;color:#222}
code,pre{font-family:ui-monospace,Consolas,monospace;background:#f4f4f4;border-radius:4px}
pre{padding:1em;overflow-x:auto} code{padding:0 .2em}
table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:.35em .6em;text-align:left}
.breadcrumb{color:#666;font-size:.9em}.badge{display:inline-block;padding:.1em .5em;border-radius:1em;font-size:.8em;background:#ddd}
.stable{background:#d4edda}.interim{background:#fff3cd}.experimental{background:#ffe5b4}.internal{background:#e2e3e5}.deprecated{background:#f8d7da}
nav a{margin-right:.8em}`;

function pageHtml(doc, uri, children, parentUri, allUris) {
    const crumbs = uri.split('.');
    const breadcrumb = crumbs.map((c, i) => `<a href="${esc(crumbs.slice(0, i + 1).join('.'))}.html">${esc(c)}</a>`).join('.');
    const portRows = doc.displayPorts.map(p => {
        const d = decomposePort(p);
        const flags = [d.catchall ? '✓' : '', d.explicit ? 'explicit' : ''].filter(Boolean).join(' ');
        return `<tr><td>${d.name ? `<code>${esc(d.name)}</code>` : ''}</td><td>${esc(d.type)}</td><td>${d.dir}</td><td>${flags}</td><td>${esc(doc.ports[p] || '')}</td></tr>`;
    }).join('\n');
    const examples = doc.examples.map((ex, i) =>
        `<h3>Example ${i + 1}</h3><pre><code>${esc(ex.code)}</code></pre>${ex.expected ? `<p>outputs:</p><pre><code>${esc(ex.expected)}</code></pre>` : ''}`).join('\n');
    const childLinks = children.map(c => `<li><a href="${esc(c)}.html">${esc(c)}</a></li>`).join('\n');
    const seeLinks = doc.see.filter(s => allUris.has(s)).map(s => `<a href="${esc(s)}.html"><code>${esc(s)}</code></a>`).join(' · ');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(uri)} — Dawn</title><style>${CSS}</style></head><body>
<nav><a href="index.html">index</a></nav>
<p class="breadcrumb">${breadcrumb}</p>
<h1><code>${esc(uri)}</code>${doc.status ? ` <span class="badge ${esc(doc.status)}">${esc(doc.status)}</span>` : ''}</h1>
<p><strong>${esc(doc.summary)}</strong></p>
${(() => { const t = doc.body.join('\n').trim(); return t ? `<div>${esc(t).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n')}</div>` : ''; })()}
${portRows ? `<h2>Ports</h2><p><em>${esc(doc.kind)} resource.</em></p><table><tr><th>name</th><th>type</th><th>dir</th><th>catch-all</th><th>meaning</th></tr>${portRows}</table>` : (doc.kind === 'value' ? `<p><em>value resource</em> — holds a ${esc(uri)}; the standard read/write ports apply and <code>_go</code> triggers the output.</p>` : `<p><em>${esc(doc.kind)} resource.</em></p>`)}
${examples ? `<h2>Examples</h2>${examples}` : ''}
${childLinks ? `<h2>Contents</h2><ul>${childLinks}</ul>` : ''}
${seeLinks ? `<p>See also: ${seeLinks}</p>` : ''}
${parentUri ? `<p>Parent: <a href="${esc(parentUri)}.html"><code>${esc(parentUri)}</code></a></p>` : ''}
</body></html>`;
}

// ── walk the implementation tree ─────────────────────────────────────────────
function* walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) { if (!SKIP.test(ent.name)) yield* walk(p); }
        else if (ent.name.endsWith('.dawn.js') && !SKIP.test(ent.name)) yield p;
    }
}

let errors = 0, pages = 0;
const resources = []; // { uri, implPath, doc, ports }

for (const implPath of walk(DAWN_DIR)) {
    const uri = uriOf(implPath);
    const source = fs.readFileSync(implPath, 'utf8');
    const ports = portsOf(source);
    const docPath = implPath.replace(/\.dawn\.js$/, '.dawn');
    if (!fs.existsSync(docPath)) {
        console.log(`MISSING DOC: ${uri}  (${path.relative(ROOT, docPath)})`);
        errors++;
        continue;
    }
    const doc = parseDoc(fs.readFileSync(docPath, 'utf8'), path.relative(ROOT, docPath));
    for (const e of doc.errors) { console.log('ERROR: ' + e); errors++; }
    if (doc.subject !== uri) { console.log(`ERROR: subject "${doc.subject}" != derived URI "${uri}" (${path.relative(ROOT, docPath)})`); errors++; }
    if (!['value', 'operator'].includes(doc.kind)) { console.log(`ERROR: ${uri}: missing or invalid @kind (expected "value" or "operator")`); errors++; }
    // visible ports: for a value resource the universal value ports never appear in docs
    let visiblePorts = ports.filter(p => !INFRASTRUCTURE_PORTS.includes(p));
    if (doc.kind === 'value') {
        const ownType = uri.split('.').pop();
        const universal = universalValuePorts(ownType);
        const shadowed = visiblePorts.filter(p => universal.has(p));
        visiblePorts = visiblePorts.filter(p => !universal.has(p));
        for (const p of shadowed) {
            if (p in doc.ports) { console.log(`ERROR: ${uri}: @port ${p} is a universal value port — value read/write ports are never documented (see documentation-standard.md rule 3)`); errors++; }
        }
    }
    for (const p of Object.keys(doc.ports)) {
        if (!visiblePorts.includes(p)) { console.log(`ERROR: ${uri}: @port ${p} not present in implementation`); errors++; }
    }
    for (const p of visiblePorts) {
        if (!(p in doc.ports)) { console.log(`ERROR: ${uri}: undocumented port ${p}`); errors++; }
    }
    if (!doc.summary) { console.log(`ERROR: ${uri}: missing one-line summary`); errors++; }
    if (!doc.status) { console.log(`ERROR: ${uri}: missing @status`); errors++; }
    doc.displayPorts = visiblePorts.sort((a, b) => (a.startsWith('in_') ? 0 : 1) - (b.startsWith('in_') ? 0 : 1)); // inputs before outputs
    resources.push({ uri, doc });
}

// ── emit pages ───────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
const allUris = new Set(resources.map(r => r.uri));
const childrenOf = {};
for (const r of resources) {
    const parts = r.uri.split('.');
    if (parts.length > 1) {
        const parent = parts.slice(0, -1).join('.');
        (childrenOf[parent] = childrenOf[parent] || []).push(r.uri);
    }
}
for (const r of resources) {
    const parts = r.uri.split('.');
    const parent = parts.length > 1 ? parts.slice(0, -1).join('.') : null;
    const children = (childrenOf[r.uri] || []).sort();
    fs.writeFileSync(path.join(OUT_DIR, r.uri + '.html'), pageHtml(r.doc, r.uri, children, parent, allUris));
    pages++;
}

// index: nested tree
function treeList(prefix) {
    const kids = (childrenOf[prefix] || []).sort();
    if (prefix && !allUris.has(prefix)) return kids.map(k => treeList(k)).join('');
    const childHtml = kids.map(k => treeList(k)).join('');
    const head = prefix ? `<li><a href="${esc(prefix)}.html"><code>${esc(prefix)}</code></a>` : '<ul>';
    return `${head}${childHtml ? (prefix ? '<ul>' : '') + childHtml + (prefix ? '</ul>' : '') : ''}${prefix ? '</li>' : '</ul>'}`;
}
const topLevel = resources.map(r => r.uri).filter(u => !u.includes('.')).sort();
const indexBody = topLevel.map(u => treeList(u)).join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'index.html'),
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dawn library</title><style>${CSS}</style></head><body><h1>Dawn library</h1><ul>${indexBody}</ul><p>${pages} resources documented</p></body></html>`);

console.log(`${pages} pages written to docs/api/  —  ${errors} error(s)`);
process.exit(errors ? 1 : 0);
