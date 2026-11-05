// Integration test: Phase 3 parity harness — the SAME route matrix is run
// against the JS reference server (dawn_console.js) and, once it exists, the
// Dawn-implemented server (server/main.dawn via dawn_run.js).
//
// While W2–W5 land the Dawn column is REPORT-ONLY: parity mismatches are
// logged as PARITY-GAP (informational) instead of failing the suite. W6 flips
// STRICT_PARITY to true and gaps become failures.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');
const STRICT_PARITY = true; // W6 cutover: parity gaps are failures

let failures = 0, successes = 0, skipped = 0, gaps = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) { console.log('PASS:', name); successes++; }
  else { console.log('FAIL:', name); console.log('  expected:', JSON.stringify(expected)); console.log('  actual:  ', JSON.stringify(actual)); failures++; }
}
function skip(name, why) { console.log('SKIP:', name, '-' + why); skipped++; }
function gap(name, dawnV, jsV) {
  const ok = JSON.stringify(dawnV) === JSON.stringify(jsV);
  if (ok) { console.log('PASS parity', name); successes++; }
  else if (STRICT_PARITY) { check('parity ' + name, dawnV, jsV); }
  else { console.log('PARITY-GAP:', name, 'dawn=' + JSON.stringify(dawnV), 'js=' + JSON.stringify(jsV)); gaps++; }
}

function startServer(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => err += d);
    resolve({ proc: p, errbuf: () => err });
  });
}

function waitFor(label, url, proc, errbuf, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return (async () => {
    while (Date.now() < deadline) {
      try { await request({ method: 'GET', url }); return url; } catch (e) { await new Promise(r => setTimeout(r, 150)); }
    }
    throw new Error(label + ' did not become ready: ' + errbuf().slice(-400));
  })();
}

// The Dawn server prints `httpServer listening on port N` once it is up.
// Pull the port from stdout so main.dawn can stay param-free (httpServer:0).
function readyFromStdout(server, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let buf = '';
    server.proc.stdout.on('data', d => {
      buf += d;
      const m = buf.match(/httpServer listening on port (\d+)/);
      if (m) resolve('http://127.0.0.1:' + m[1]);
    });
    setTimeout(() => reject(new Error('dawn server never printed its listening port: ' + server.errbuf().slice(-400))), timeoutMs);
  });
}

function request({ method, url, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        contentType: (res.headers['content-type'] || '').split(';')[0],
        csp: res.headers['content-security-policy'] || null,
        body: Buffer.concat(chunks)
      }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

// One request → comparable signature (digest, not the full body).
async function probe(base, entry) {
  const res = await request({ base, method: entry.method, url: base + entry.route, body: entry.body });
  const out = { status: res.status, contentType: res.contentType, body: crypto.createHash('sha256').update(res.body).digest('hex').slice(0, 16) + ':' + res.body.length };
  if (entry.checkCsp) out.cspHasUnsafeEval = !!(res.csp && res.csp.includes('unsafe-eval'));
  return out;
}

async function runMatrix(label, base, tmpSavePath, saveBody) {
  const codeexamples = 'file:///' + path.join(ROOT, 'public', 'codeexamples').replace(/\\/g, '/');
  const matrix = [
    { name: 'root index', method: 'GET', route: '/', checkCsp: true },
    { name: 'editor page', method: 'GET', route: '/editor.html' },
    { name: 'tutorial page', method: 'GET', route: '/tutorial.html' },
    { name: 'console page', method: 'GET', route: '/dawn_console.html' },
    { name: 'environment.json', method: 'GET', route: '/environment.json' },
    { name: 'dir listing', method: 'GET', route: '/' + codeexamples },
    { name: 'file read', method: 'GET', route: '/' + codeexamples + '/HelloWorld.dawn' },
    { name: 'svg asset', method: 'GET', route: '/images/dawnfile.svg' },
    { name: 'file missing', method: 'GET', route: '/' + codeexamples + '/no-such-file.dawn' },
    { name: 'unknown route catchall', method: 'GET', route: '/__never_matched__' },
  ];
  for (const entry of matrix) {
    const probeResult = await probe(base, entry);
    // location-dependent bits are normalized out; what matters is that the two
    // mounts serve the same bytes. environment.json paths differ per machine but
    // must stay identical between two servers started from the same cwd.
    if (entry.name === 'environment.json') probeResult.sig = 'dynamic-paths';
    results[entry.name] = probeResult;
    if (label === 'js') {
      // reference-server contract spot checks
      if (entry.name === 'root index') check('js:/ status', probeResult.status, 200);
      if (entry.name === 'environment.json') check('js:/environment.json status', probeResult.status, 200);
      if (entry.name === 'unknown route catchall') check('js:catchall 204', probeResult.status, 204);
      if (entry.name === 'file missing') check('js:missing file 404', probeResult.status, 404);
      if (entry.name === 'dir listing') check('js:dir json content-type', probeResult.contentType, 'text/directory-json');
      if (entry.name === 'file read') check('js:dawn file content-type', probeResult.contentType, 'text/dawn');
      if (entry.name === 'svg asset') check('js:svg asset content-type', probeResult.contentType, 'image/svg+xml');
    }
  }
  // PUT round-trip: body is echoed to disk by the server, we verify via FS.
  const putRes = await request({ method: 'PUT', url: base + '/_file?path=' + encodeURIComponent('file:///' + tmpSavePath.replace(/\\/g, '/')), body: saveBody });
  let readBack = '';
  try { readBack = fs.readFileSync(tmpSavePath, 'utf8'); } catch (e) { readBack = '<no file>'; }
  try { fs.unlinkSync(tmpSavePath); } catch (e) {}
  results['put _file'] = { status: putRes.status, bodyText: putRes.body.toString('utf8') ? '1' : '0', written: readBack === saveBody };
  if (label === 'js') {
    check('js:PUT _file 200', putRes.status, 200);
    check('js:PUT _file writes bytes', readBack, saveBody);
  }
  return results;
}

let results; // per-server map

(async () => {
  const tmpSavePath = path.join(os.tmpdir(), `dawn_parity_${Date.now()}.txt`);
  const saveBody = 'phase3 parity round-trip ✓';

  // JS reference server (dawn_console.js listens on PORT || 5000).
  const jsPort = 20000 + (process.pid % 20000);
  const js = await startServer('node', [path.join(ROOT, 'Dump', 'dawn_console.js')], { PORT: String(jsPort) });
  let dawn = null;
  try {
    const jsBase = `http://127.0.0.1:${jsPort}`;
    await waitFor('js', jsBase + '/environment.json', js.proc, js.errbuf);
    results = {};
    const jsResults = await runMatrix('js', jsBase, tmpSavePath, saveBody);

    // Dawn server — joins the matrix once the Phase 3 entry point exists.
    const dawnEntry = path.join(ROOT, 'server', 'main.dawn');
    const dawnScheme = path.join(ROOT, 'dawn', 'Scheme', 'httpServer.dawn');
    if (fs.existsSync(dawnEntry) && fs.existsSync(dawnScheme)) {
      dawn = await startServer('node', [path.join(ROOT, 'dawn.js'), 'server/main.dawn'], {});
      const dawnBase = await readyFromStdout(dawn);
      results = {};
      const dawnResults = await runMatrix('dawn', dawnBase, tmpSavePath, saveBody);
      for (const name of Object.keys(jsResults)) gap(name, dawnResults[name], jsResults[name]);
      check('dawn:svg asset content-type', dawnResults['svg asset'] && dawnResults['svg asset'].contentType, 'image/svg+xml');

      // W5 route 1: the Dawn server answers GET /environment.json itself
      const env = await request({ method: 'GET', url: dawnBase + '/environment.json' });
      check('dawn:/environment.json status', env.status, 200);
      check('dawn:/environment.json content-type', env.contentType, 'text/json');
      const envJson = JSON.parse(env.body.toString('utf8'));
      check('dawn:/environment.json keys', JSON.stringify(Object.keys(envJson)), JSON.stringify(['dawnPath', 'userPath']));
    } else {
      skip('parity matrix vs dawn server', 'server/main.dawn + dawn/Scheme/httpServer.dawn not built yet (W2+)');
    }
  } catch (e) {
    console.log('FAIL: harness error', e.message);
    failures++;
  } finally {
    if (js) js.proc.kill();
    if (dawn) dawn.proc.kill();
  }
  console.log(`${successes} passed, ${failures} failed, ${skipped} skipped (integration)`);
  process.exit(failures ? 1 : 0);
})();
