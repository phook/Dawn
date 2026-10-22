const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const BNFT = require('../BNFT/BNFT.js');

const UPDATE = process.argv.includes('--update');
const rootDir = path.join(__dirname, '..');
const dawnCasesDir = path.join(__dirname, 'cases', 'dawn');
const basicCasesDir = path.join(__dirname, 'cases', 'basic');

const grammarSource = fs.readFileSync(path.join(rootDir, 'dawn/Flavors/basic.bnft'), 'utf8');
const parser = new BNFT(grammarSource, {
    alert: () => {},
    fileToString: url => fs.readFileSync(path.join(rootDir, url), 'utf8'),
    path: 'dawn/Flavors/'
});

function runBnft(source, nonterminal) {
    return parser.parse(source, { nonterminal, alert: () => {} }) || 'ERROR';
}

let passed = 0, failed = 0, updated = 0;

function check(label, actual, expectedPath, isBasicRoundtrip) {
    if (UPDATE) {
        fs.writeFileSync(expectedPath, actual);
        console.log(`UPDATED: ${label}`);
        updated++;
        return;
    }
    if (!fs.existsSync(expectedPath)) {
        console.log(`SKIP:    ${label}  (no expected file — run with --update)`);
        return;
    }
    const expected = fs.readFileSync(expectedPath, 'utf8').trimEnd();
    if (actual === expected) {
        console.log(`PASS:    ${label}`);
        passed++;
    } else if (UPDATE && isBasicRoundtrip && actual !== 'ERROR') {
        // For dawn->basic round-trip: copy actual output into basic file so it passes next run
        fs.writeFileSync(expectedPath, actual);
        console.log(`UPDATED: ${label} (dawn→basic round-trip target updated)`);
        updated++;
    } else {
        console.log(`FAIL:    ${label}`);
        console.log(`         expected: ${JSON.stringify(expected)}`);
        console.log(`         actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

// ── Dawn execution tests ─────────────────────────────────────────────────────
console.log('\n── Dawn execution ──');

const dawnFiles = fs.readdirSync(dawnCasesDir)
    .filter(f => f.endsWith('.dawn'))
    .sort();

for (const file of dawnFiles) {
    const name = file.replace('.dawn', '');
    const dawnPath = path.join(dawnCasesDir, file);
    const expectedPath = path.join(dawnCasesDir, name + '.expected');

    let actual;
    try {
        actual = execSync(`node dawn.js "${dawnPath}"`, {
            cwd: rootDir,
            timeout: 10000,
            encoding: 'utf8'
        }).trimEnd();
    } catch (err) {
        actual = (err.stdout || '').trimEnd();
        if (err.stderr) actual += (actual ? '\n' : '') + err.stderr.trimEnd();
    }

    check(`dawn/${name}`, actual, expectedPath);
}

// ── Basic flavor: basic → dawn ───────────────────────────────────────────────
// `prompt_*` cases exercise the console's command-prompt grammar
// (TODAWN_/FROMDAWN_COMMANDPROMT instead of PROGRAM).
console.log('\n── Basic flavor: basic → dawn ──');

const basicFiles = fs.readdirSync(basicCasesDir)
    .filter(f => f.endsWith('.basic'))
    .sort();

const isPrompt = name => name.startsWith('prompt_');

for (const file of basicFiles) {
    const name = file.replace('.basic', '');
    const basicSource = fs.readFileSync(path.join(basicCasesDir, file), 'utf8');
    const nt = isPrompt(name) ? 'TODAWN_COMMANDPROMT' : 'TODAWN_PROGRAM';
    const result = runBnft(basicSource, nt).trimEnd();
    check(`basic/${name}  (basic→dawn)`, result, path.join(basicCasesDir, name + '.dawn'));
}

// ── Basic flavor: dawn → basic (round-trip) ──────────────────────────────────
console.log('\n── Basic flavor: dawn → basic ──');

for (const file of basicFiles) {
    const name = file.replace('.basic', '');
    const basicPath = path.join(basicCasesDir, file);
    const dawnPath = path.join(basicCasesDir, name + '.dawn');

    if (!fs.existsSync(dawnPath)) {
        console.log(`SKIP:    basic/${name}  (dawn→basic, no .dawn source — run basic→dawn first)`);
        continue;
    }

    const dawnSource = fs.readFileSync(dawnPath, 'utf8') + (isPrompt(name) ? "" : "\n");
    const result = runBnft(dawnSource, isPrompt(name) ? 'FROMDAWN_COMMANDPROMT' : 'FROMDAWN_PROGRAM');
    const basicSource = fs.readFileSync(basicPath, 'utf8');

    if (result === 'ERROR' || result.startsWith('ERROR:')) {
        console.log(`FAIL:    basic/${name}  (dawn→basic)`);
        console.log(`         parser error on: ${JSON.stringify(dawnSource.trim())}`);
        console.log(`         result: ${result}`);
        failed++;
        continue;
    }

    if (result === basicSource) {
        console.log(`PASS:    basic/${name}  (dawn→basic)`);
        passed++;
    } else {
        check(`basic/${name}  (dawn→basic)`, result, path.join(basicCasesDir, name + '.basic'), true);
    }
}

// ── Documentation examples ─────────────────────────────────────────────────
// Every @example in a Meta.documentation sidecar (docs/documentation-standard.md)
// is executed and its output compared — docs are tests.
console.log('\n── Documentation examples ──');

function* walkDocFiles(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) { if (!/backup|Sync|Copy|_old|\.bak/i.test(ent.name)) yield* walkDocFiles(p); }
        else if (ent.name.endsWith('.dawn')) yield p;
    }
}

// minimal mirror of build_docs.js's @example parser.
// Doc files are legal Dawn programs: EVERY line (including example code and
// expected output) carries the Meta.documentation: prefix, stripped here first.
function extractExamples(source) {
    const PREFIX = 'Meta.documentation:';
    const lines = source.split(/\r?\n/)
        .map(l => (l.startsWith(PREFIX) || l.trim() === '') ? l.substring(l.startsWith(PREFIX) ? PREFIX.length : 0) : null)
        .filter(l => l !== null);
    const examples = [];
    let current = null, section = null;
    for (const line of lines) {
        if (line.startsWith('@')) {
            if (line.startsWith('@example')) { current = { code: [], expected: null }; examples.push(current); section = 'code'; }
            else if (current) { if (section === 'code') current.expected = []; section = null; current = null; }
            continue;
        }
        if (!current) continue;
        if (section === 'code') {
            if (line.trim() === '---') { current.expected = []; section = 'expected'; continue; }
            current.code.push(line);
        } else current.expected.push(line);
    }
    for (const ex of examples) {
        ex.code = ex.code.join('\n').trim();
        ex.expected = (ex.expected || []).join('\n').replace(/\s+$/, '');
    }
    return examples.filter(e => e.code);
}

for (const docPath of walkDocFiles(path.join(rootDir, 'dawn'))) {
    const source = fs.readFileSync(docPath, 'utf8');
    if (!source.startsWith('Meta.documentation:')) continue;
    const subject = source.split(/\r?\n/)[0].substring('Meta.documentation:'.length).trim();
    extractExamples(source).forEach((ex, i) => {
        const label = `doc/${subject} example ${i + 1}`;
        const tmp = path.join(rootDir, 'Test', '.tmp_doc_example.dawn');
        fs.writeFileSync(tmp, ex.code);
        let actual;
        try {
            actual = execSync(`node dawn.js "${tmp}"`, { cwd: rootDir, timeout: 10000, encoding: 'utf8' }).trimEnd();
        } catch (err) {
            actual = (err.stdout || '').trimEnd();
            if (err.stderr) actual += (actual ? '\n' : '') + err.stderr.trimEnd();
        } finally {
            fs.unlinkSync(tmp);
        }
        if (actual === ex.expected) { console.log(`PASS:    ${label}`); passed++; }
        else {
            console.log(`FAIL:    ${label}`);
            console.log(`         expected: ${JSON.stringify(ex.expected)}`);
            console.log(`         actual:   ${JSON.stringify(actual)}`);
            failed++;
        }
    });
}

// ── Integration tests (Test/integration/*.test.js) ───────────────────────────
// Self-contained scripts (own fixture servers); integration asserts by exit code.
const integrationDir = path.join(__dirname, 'integration');
if (fs.existsSync(integrationDir)) {
    console.log('\n── Integration tests ──');
    for (const file of fs.readdirSync(integrationDir).filter(f => f.endsWith('.test.js')).sort()) {
        const label = `integration/${file}`;
        try {
            execSync(`node "${path.join(integrationDir, file)}"`, { cwd: rootDir, timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
            console.log(`PASS:    ${label}`);
            passed++;
        } catch (err) {
            console.log(`FAIL:    ${label}`);
            console.log('         ' + String(err.stdout || '').trim().split('\n').join('\n         '));
            failed++;
        }
    }
}

// ── Summary ──────────────────────────────────────────────────────────────────
if (UPDATE) {
    console.log(`\n${updated} snapshots updated`);
} else {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}
