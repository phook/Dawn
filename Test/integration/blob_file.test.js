// Integration test: octetstream wave — file binary round-trip, cast tree resolution,
// and native octetstream-interface round-trips (Number fraction, String unicode,
// Data JSON, List typed-JSON).
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

function runCase(source) {
  return new Promise((resolve) => {
    const tmp = path.join(os.tmpdir(), `dawn_octetstream_${Date.now()}_${Math.floor(Math.random()*1e6)}.dawn`);
    fs.writeFileSync(tmp, source);
    const p = spawn('node', [path.join(ROOT, 'dawn_run.js'), tmp], { cwd: ROOT });
    let buf = '';
    p.stdout.on('data', d => buf += d);
    p.stderr.on('data', d => buf += d);
    p.on('close', () => { fs.unlinkSync(tmp); resolve(buf.trimEnd()); });
    setTimeout(() => { try { p.kill(); } catch(e){} resolve(buf.trimEnd()); }, 15000);
  });
}

(async () => {
  // 1. file binary round-trip: read favicon as octetstream, write the octetstream back out,
  //    compare bytes exactly.
  const tmpBin = path.join(os.tmpdir(), `dawn_octetstream_${Date.now()}.bin`).replace(/\\/g, '/');
  const out = await runCase(`file:public/images/favicon.png?read>>file:${tmpBin}?write>>Console:`);
  check('file octetstream round-trip console', out, '');
  const a = fs.readFileSync(path.join(ROOT, 'public/images/favicon.png'));
  const b = fs.readFileSync(tmpBin);
  check('file octetstream round-trip bytes', Buffer.compare(a, b), 0);
  fs.unlinkSync(tmpBin);

  // 2. native octetstream-interface round-trips, in-process through the Dawn runtime.
  const Dawn = require(ROOT + '/public/dawn.js');
  global.Dawn = Dawn;
  const __origRequire = Dawn.require.bind(Dawn);
  Dawn.require = function serverRequire(url) {
    if (!Dawn.__cache) Dawn.__cache = {};
    if (url in Dawn.__cache) return Dawn.__cache[url];
    const tryRequire = (abs) => { try { return require(abs); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } };
    let result;
    if (!url.startsWith('./') && !url.startsWith('../') && !path.isAbsolute(url)) {
      const dawnBase = path.join(ROOT, 'dawn', url);
      result = tryRequire(dawnBase + '.dawn.js') || tryRequire(dawnBase + '.js') || tryRequire(dawnBase) || tryRequire(url);
    } else {
      const absBase = path.resolve(ROOT, url).replace(/\.(dawn\.js|js)$/, '');
      result = tryRequire(absBase + '.dawn.js') || tryRequire(absBase + '.js') || tryRequire(absBase);
      if (!result) {
        const dawnBase = path.resolve(ROOT, 'dawn', url.replace(/^\.\//, '')).replace(/\.(dawn\.js|js)$/, '');
        result = tryRequire(dawnBase + '.dawn.js') || tryRequire(dawnBase + '.js') || tryRequire(dawnBase);
      }
    }
    if (result !== undefined) Dawn.__cache[url] = result;
    return result;
  };
  await Dawn.initialize('./dawn');
  const root = Dawn.instanciate_processor();
  
  // String (unicode) — UTF-8 round-trip through the octetstream interface + text seed
  const text = 'héllo ✓';
  const sProc = await root.lookup('String:' + encodeURIComponent(text));
  const sCast = await Dawn.cast('text/plain', sProc.toBlob(), null);
  check('string unicode round-trip', sCast.get_resource().value, text);
  check('text seed output plug listed', ('out_String' in sCast.outputList), true);

  // Number (1/3) — exact fraction round-trip through the octetstream interface
  const nProc = await root.lookup('Number:1/3');
  const nBytes = nProc.toBlob();
  const nBack = await root.lookup('Number:0');
  nBack.in_octetstream_$all({ value: nBytes });
  check('number fraction round-trip', nBack.get_resource().value.toString(), '1/3');

  // Data — JSON round-trip through the application/json seed
  const dProc = Dawn.castValue('Data', { a: [1, 2], b: 'x' });
  const dCast = await Dawn.cast('application/json', dProc.toBlob(), null);
  check('data json round-trip', JSON.stringify(dCast.get_resource().value), JSON.stringify({ a: [1, 2], b: 'x' }));
  check('json seed output plug listed', ('out_Data' in dCast.outputList), true);

  // Blob — octet-stream falls through to data.Application, identity
  const bCast = await Dawn.cast('application/octet-stream', new Uint8Array([1, 2, 3]), null);
  check('octetstream default cast length', bCast.get_resource().value.length, 3);

  // image/png — Content-Type/image seed produces an octetstream
  const iCast = await Dawn.cast('image/png', new Uint8Array([9, 9]), null);
  check('image seed octetstream length', iCast.get_resource().value.length, 2);
  check('image seed output plug listed', ('out_octetstream' in iCast.outputList), true);

  // List — typed-JSON round-trip with mixed elements (incl. exact Number fraction)
  const list = await root.lookup('List:');
  await list.add('String:hello', 'Number:1/3', 'Boolean:true');
  const listBytes = list.toBlob();
  const listBack = await root.lookup('List:');
  listBack.in_octetstream_$all({ value: listBytes });
  const els = listBack.get_resource().elements.map(e => e.name + ':' + (e.value && e.value.toString ? e.value.toString() : e.value));
  check('list typed-json round-trip', els.join(','), 'String:hello,Number:1/3,Boolean:true');

  console.log(`${successes} passed, ${failures} failed (integration)`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL: harness error', e.message); process.exit(1); });
