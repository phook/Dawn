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
    const p = spawn('node', [path.join(ROOT, 'dawn.js'), tmp], { cwd: ROOT });
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
  check('text seed output plug listed', ('out_String_default' in sCast.outputList), true);

  // Number (1/3) — exact fraction round-trip through the octetstream interface
  const nProc = await root.lookup('Number:1/3');
  const nBytes = nProc.toBlob();
  const nBack = await root.lookup('Number:0');
  nBack.in_octetstream_default_$all({ value: nBytes });
  check('number fraction round-trip', nBack.get_resource().value.toString(), '1/3');

  // Data — JSON round-trip through the application/json seed
  const dProc = Dawn.castValue('Data', { a: [1, 2], b: 'x' });
  const dCast = await Dawn.cast('application/json', dProc.toBlob(), null);
  check('data json round-trip', JSON.stringify(dCast.get_resource().value), JSON.stringify({ a: [1, 2], b: 'x' }));
  check('json seed output plug listed', ('out_Data_default' in dCast.outputList), true);

  // Blob — octet-stream falls through to data.Application, identity
  const bCast = await Dawn.cast('application/octet-stream', new Uint8Array([1, 2, 3]), null);
  check('octetstream default cast length', bCast.get_resource().value.length, 3);

  // image/* without a seeded subtype resolves the family main (raw bytes blob)
  const iCast = await Dawn.cast('image/bmp', new Uint8Array([9, 9]), null);
  check('image family octetstream length', iCast.get_resource().value.length, 2);
  check('image family output plug listed', ('out_octetstream_default' in iCast.outputList), true);

  // ── image subtype wave: typed Content-Type/image/* resources ──
  // png cast resolves the png SUBTYPE from the tree (not the family main)
  const pngCast = await Dawn.cast('image/png', new Uint8Array([9, 9]), null);
  check('png cast resolves the png subtype', pngCast.get_resource().name, 'png');
  check('png cast bytes intact', Buffer.from(pngCast.get_resource().value).toString('hex'), '0909');
  check('png cast content-type stamped', pngCast.get_resource().contentType, 'image/png');
  check('png typed output listed', ('out_image_png_default' in pngCast.outputList), true);

  // svg subtype — bytes uniform, markup reachable as a String on go
  const svgCast = await Dawn.cast('image/svg+xml', new Uint8Array(Buffer.from('<svg xmlns="x"></svg>')), null);
  check('svg cast resolves the svg subtype', svgCast.get_resource().name, 'svg');
  let svgText = null;
  svgCast.out_String_default = (v) => { svgText = v.get_resource().value; };
  await svgCast.in_go?.();
  check('svg out_String decodes the markup', svgText, '<svg xmlns="x"></svg>');

  // file read lands as the typed resource (?read cast path, typed output bound)
  const faviconAbs = path.join(ROOT, 'public', 'images', 'favicon.png').replace(/\\/g, '/');
  const captured = {};
  const captureSink = {
    offer_connection: (name) => { captured[name] = (v) => { captured[name + '_value'] = v; }; return captured[name]; },
    in_begin() {}, in_go() {}, in_end() {}
  };
  const readProc = await root.lookup('file:' + faviconAbs + '?read');
  readProc.connectee = captureSink;
  await readProc.in_go();
  await new Promise((r) => setTimeout(r, 400));
  check('file read casts to the typed png resource', captured.image_png_default_value && captured.image_png_default_value.get_resource ? captured.image_png_default_value.get_resource().name : null, 'png');
  check('file read png bytes intact', captured.image_png_default_value ? Buffer.compare(Buffer.from(captured.image_png_default_value.get_resource().value), fs.readFileSync(faviconAbs)) : -1, 0);

  // writing a file through the image's own input (typed sink write round-trip)
  const tmpPng = path.join(os.tmpdir(), `dawn_typed_${Date.now()}.png`).replace(/\\/g, '/');
  const sinkProc = await root.lookup('file:' + tmpPng + '?write');
  const pngRes = await root.lookup('Content-Type.image.png:');
  pngRes.in_octetstream_default_$all({ value: new Uint8Array(fs.readFileSync(faviconAbs)) });
  sinkProc.in_image_write(pngRes);
  sinkProc.in_end();
  check('typed write bytes on disk', Buffer.compare(fs.readFileSync(tmpPng), fs.readFileSync(faviconAbs)), 0);
  fs.unlinkSync(tmpPng);

  // the connection derives the reply mime from the arriving input port
  const stubHeaders = {};
  const stub = {
    headers: stubHeaders, statusCode: 0, body: null,
    setHeader(k, v) { stubHeaders[k.toLowerCase()] = v; },
    end(b) { this.body = b; }
  };
  const connProc = new (Dawn.require('Scheme/httpConnection'))().instanciate_processor();
  connProc.resource.res = stub;
  connProc.in_image_png_default_$all({ value: new Uint8Array([1, 2, 3]) });
  check('connection in_image_png_default_$all replies image/png', stubHeaders['content-type'], 'image/png');
  check('connection png body bytes', stub.body.toString('hex'), '010203');
  const stub2Headers = {};
  const connProc2 = new (Dawn.require('Scheme/httpConnection'))().instanciate_processor();
  connProc2.resource.res = { headers: {}, statusCode: 0, setHeader(k, v) { stub2Headers[k.toLowerCase()] = v; }, end(b) { this.body = b; } };
  connProc2.in_image_svg_default_$all({ value: new Uint8Array(Buffer.from('<svg/>')) });
  check('connection in_image_svg_default_$all replies image/svg+xml', stub2Headers['content-type'], 'image/svg+xml');

  // ── port-name grammar: subtype rule, specificity, universal sink, markers ──
  const ResourceCtor = Dawn.require('Content-Type/data/Resource');
  const targetWith = (inputs) => {
    const t = new ResourceCtor().instanciate_processor();
    for (const name of Object.keys(inputs)) t[name] = inputs[name];
    return t;
  };
  // family input accepts a subtype offer (the inheritance case)
  const famTarget = targetWith({ in_image_write: function() {} });
  check('family input accepts a gif offer', typeof famTarget.offer_connection('image_gif_default'), 'function');
  // specificity: the png-specific input wins over the family input
  let hit = null;
  const bothTarget = targetWith({
    in_image_write: function() { hit = 'family'; },
    in_image_png_write: function() { hit = 'png-specific'; }
  });
  bothTarget.offer_connection('image_png_default')();
  check('most specific input chain wins', hit, 'png-specific');
  // cross-subtype rejection: a png-specific input rejects a gif offer
  const pngOnly = targetWith({ in_image_png_write: function() {} });
  check('png-specific input rejects a gif offer', pngOnly.offer_connection('image_gif_default'), undefined);
  // raw-byte offers match chain-equal octetstream inputs; typed values do NOT
  // reach [octetstream] inputs — they go through the family inputs instead
  hit = null;
  const sinkTarget = targetWith({
    in_octetstream_write: function() { hit = 'bytes'; },
    in_Data_write: function() { hit = 'data'; }
  });
  sinkTarget.offer_connection('Data')();
  check('specific Data input beats the octetstream input', hit, 'data');
  sinkTarget.offer_connection('octetstream')();
  check('octetstream input accepts a raw byte offer', hit, 'bytes');
  const byteOnly = targetWith({ in_octetstream_write: function() {} });
  check('octetstream input does not accept a typed image offer', byteOnly.offer_connection('image_gif_default'), undefined);
  // _$all ports stay multi-bindable
  const allTarget = targetWith({ 'in_response_default_$all': function() {} });
  check('_$all port binds', typeof allTarget.offer_connection('response_default'), 'function');
  check('_$all port stays bindable', typeof allTarget.offer_connection('response_default'), 'function');
  // lifecycle ports keep the simple rules and stay multi-bindable
  const lifeTarget = targetWith({ in_end: function() {} });
  check('lifecycle in_end binds by simple name', typeof lifeTarget.offer_connection('end'), 'function');
  check('lifecycle in_end stays multi-bindable', typeof lifeTarget.offer_connection('end'), 'function');

  // List — typed-JSON round-trip with mixed elements (incl. exact Number fraction)
  const list = await root.lookup('List:');
  await list.add('String:hello', 'Number:1/3', 'Boolean:true');
  const listBytes = list.toBlob();
  const listBack = await root.lookup('List:');
  listBack.in_octetstream_default_$all({ value: listBytes });
  const els = listBack.get_resource().elements.map(e => e.name + ':' + (e.value && e.value.toString ? e.value.toString() : e.value));
  check('list typed-json round-trip', els.join(','), 'String:hello,Number:1/3,Boolean:true');

  console.log(`${successes} passed, ${failures} failed (integration)`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL: harness error', e.message); process.exit(1); });
