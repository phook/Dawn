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
    return parser.parse(source.trim(), { nonterminal, alert: () => {} }) || 'ERROR';
}

let passed = 0, failed = 0, updated = 0;

function check(label, actual, expectedPath) {
    if (UPDATE) {
        fs.writeFileSync(expectedPath, actual + '\n');
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
        actual = execSync(`node dawn_run.js "${dawnPath}"`, {
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
console.log('\n── Basic flavor: basic → dawn ──');

const basicFiles = fs.readdirSync(basicCasesDir)
    .filter(f => f.endsWith('.basic'))
    .sort();

for (const file of basicFiles) {
    const name = file.replace('.basic', '');
    const basicSource = fs.readFileSync(path.join(basicCasesDir, file), 'utf8');
    const result = runBnft(basicSource, 'FLOW');
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

    const dawnSource = fs.readFileSync(dawnPath, 'utf8');
    const result = runBnft(dawnSource, 'FROMDAWN_FLOW');
    const basicSource = fs.readFileSync(basicPath, 'utf8').trimEnd();

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
        console.log(`FAIL:    basic/${name}  (dawn→basic)`);
        console.log(`         expected: ${JSON.stringify(basicSource)}`);
        console.log(`         actual:   ${JSON.stringify(result)}`);
        failed++;
    }
}

// ── Summary ──────────────────────────────────────────────────────────────────
if (UPDATE) {
    console.log(`\n${updated} snapshots updated`);
} else {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}
