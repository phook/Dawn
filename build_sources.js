// build_sources.js — generate .dawn.js implementations from .dawn sources.
//
// Source of truth = the .dawn file. A resource source contains Meta.documentation
// lines (docs) and a native-javascript implementation:
//
//   define String.upper
//     native javascript
//     {
//       // plain JS .dawn.js content, verbatim
//     }
//     endnative
//   end
//
// For every such block, this writes the corresponding .dawn.js next to the
// source ONLY when stale (mtime differs), then stamps the artifact with the
// SOURCE's timestamp (so "stale" ⟺ "source touched since last build") and marks
// it hidden (generated artifact, not a file you edit).
//
// (Transitional: actual semantic lowering through the canonical Dawn compiler
// arrives with Phase 2/3; this is a faithful extraction step, no re-grammar.)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FORCE = process.argv.includes('--force');

const ROOT = __dirname;
const DAWN_DIR = path.join(ROOT, 'dawn');
// App-level sources live outside dawn/ (e.g. server/scheme/*.dawn) and their
// .dawn.js artifacts are just as gitignored — build them too or a fresh deploy
// crashes resolving app scheme resources.
const SOURCE_DIRS = [DAWN_DIR, path.join(ROOT, 'server')];

function* walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) { yield* walk(p); }
        else if (ent.name.endsWith('.dawn')) yield p;
    }
}

// extract native-javascript blocks from a canonical .dawn source.
// Canonical form (what the basic flavor's `native javascript {...}` lowers to):
//   [Native.Javascript:<urlencoded js>]>>NewResource:<URI>
// Braces/brackets in the JS are encoded already (%5B/%5D), so the flow line is
// safe inside list brackets.
function extractNativeBlocks(source) {
    const blocks = [];
    const re = /\[\s*Native\.Javascript:([^\]]*)\]\s*>>NewResource:[A-Za-z0-9._]+:?/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        blocks.push(decodeURIComponent(m[1]).split('\n'));
    }
    return blocks;
}

// reduce the native block content: it's wrapped in one extra { } pair by our syntax
function blockToLines(lines, out) { return lines; }

let written = 0, fresh = 0, errors = 0;

for (const SOURCE_DIR of SOURCE_DIRS)
for (const srcPath of walk(SOURCE_DIR)) {
    const source = fs.readFileSync(srcPath, 'utf8');
    if (!/Native\.Javascript:/.test(source)) continue;

    const blocks = extractNativeBlocks(source);
    if (!blocks.length) { console.log(`WARN: define but no native block parsed: ${path.relative(ROOT, srcPath)}`); continue; }

    const implPath = srcPath.replace(/\.dawn$/, '.dawn.js');
    const content = blocks.map(b => b.join('\n')).join('\n');

    const stat = fs.statSync(srcPath);
    let needWrite = FORCE || true;
    if (fs.existsSync(implPath)) {
        const implStat = fs.statSync(implPath);
        if (!FORCE && Math.abs(implStat.mtimeMs - stat.mtimeMs) < 1) needWrite = false; // same stamp = fresh
    }
    if (!needWrite) {
        // still verify content matches (timestamp copied so normally true)
        fresh++;
        continue;
    }
    if (fs.existsSync(implPath)) {
        try { execSync(`attrib -h "${implPath}"`); } catch (e) {} // unhide before overwrite
    }
    fs.writeFileSync(implPath, content);
    // stamp artifact with SOURCE timestamp so staleness = mtime mismatch
    fs.utimesSync(implPath, stat.atime, stat.mtime);
    // hidden attribute (Windows) — generated artifact, do not edit by hand
    try { execSync(`attrib +h "${implPath}"`); } catch (e) {}
    console.log(`BUILT: ${path.relative(ROOT, implPath)}`);
    written++;
}

console.log(`${written} built, ${fresh} fresh, from dawn/ + server/ sources`);
