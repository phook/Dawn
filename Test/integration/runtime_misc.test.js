// Integration test: Phase 3 runtime primitives — argv:, env:, exec:, exit:,
// run as real programs through dawn_run.js.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');
let failures = 0, successes = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) { console.log('PASS:', name); successes++; }
  else { console.log('FAIL:', name); console.log('  expected:', JSON.stringify(expected)); console.log('  actual:  ', JSON.stringify(actual)); failures++; }
}

function runCase(source, args) {
  return new Promise((resolve) => {
    const tmp = path.join(os.tmpdir(), `dawn_misc_${Date.now()}_${Math.floor(Math.random()*1e6)}.dawn`);
    fs.writeFileSync(tmp, source);
    const p = spawn('node', [path.join(ROOT, 'dawn.js'), tmp].concat(args || []), { cwd: ROOT });
    let buf = '';
    p.stdout.on('data', d => buf += d);
    p.stderr.on('data', d => buf += d);
    p.on('close', (code) => { fs.unlinkSync(tmp); resolve({ out: buf.trimEnd(), code }); });
    setTimeout(() => { try { p.kill(); } catch (e) {} resolve({ out: buf.trimEnd(), code: -9 }); }, 15000);
  });
}

(async () => {
  // mime: extension + fallback
  let r = await runCase('mime:png>>Console:');
  check('mime:png', r.out, 'image/png');
  r = await runCase('mime:nosuchext>>Console:');
  check('mime unknown ext falls back to binary/', r.out, 'binary/nosuchext');

  // argv: sees user args after the program path (dawn_run allows trailing args)
  r = await runCase('argv:0>>Console:', ['firstArg']);
  check('argv:0 = first user arg', r.out, 'firstArg');
  r = await runCase('argv:1>>Console:', ['firstArg']);
  check('argv:1 out-of-range -> empty', r.out, '');

  // env: shows a real var
  r = await runCase('env:DAWN_PARITY_TEST>>Console:');
  check('env missing -> empty', r.out, '');

  // exec: shell command stdout flows downstream
  r = await runCase('String:echo%20exec-ok>>exec:>>Console:');
  check('exec echo', r.out === 'exec-ok' || r.out === 'exec-ok\r', true);

  // dawn: meta
  r = await runCase('String:String%3AHello%3E%3EConsole%3A>>dawn:>>Console:');
  check('dawn: meta runs inner program', r.out, 'Hello');

  // exit: code (no "USAGE"/error noise expected)
  r = await runCase('exit:3');
  check('exit:3 exit code', r.code, 3);
  check('exit:3 quiet', r.out, '');

  console.log(`${successes} passed, ${failures} failed (integration)`);
  process.exit(failures ? 1 : 0);
})();
