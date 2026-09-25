// Integration test: Phase 3 parity harness — the SAME route matrix is run
// against the JS reference server (dawn_console.js) and, once it exists, the
// Dawn-implemented server (server/main.dawn via dawn_run.js). Responses must
// match byte-for-byte (status, content-type, body digest).
//
// Until the Dawn server exists, its column is SKIPped and the harness still
// asserts the reference contract (so dawn_console.js regressions are caught).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');

let failures = 0, successes = 0, skipped = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) { console.log('PASS:', name); successes++; }
  else { console.log('FAIL:', name); console.log('  expected:', JSON.stringify(expected)); console.log('  actual:  ', JSON.stringify(actual)); failures++; }
}
function skip(name, why) { console.log('SKIP:', name, '-' + why); skipped++; }

function startServer(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => err += d);
    resolve({ proc: p, errbuf: () => err });
  });
}

async function waitFor(label, url, proc, errbuf, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await request({ method: 'GET', url }); return; } catch (e) { await new Promise(r => setTimeout(r, 150)); }
  }
  throw new Error(label + ' did not become ready: ' + errbuf().slice(-400));
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
    { name: 'root index', method: 'GET', route: '/' },
    { name: 'editor page', method: 'GET', route: '/editor.html' },
    { name: 'index page', method: 'GET', route: '/index.html' },
    { name: 'csp route', method: 'GET', route: '/test-csp', checkCsp: true },
    { name: 'environment.json', method: 'GET', route: '/environment.json' },
    { name: 'dir listing', method: 'GET', route: '/' + codeexamples },
    { name: 'file read', method: 'GET', route: '/' + codeexamples + '/HelloWorld.dawn' },
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
    }
  }
  // PUT round-trip: body is echoed to disk by the server, we verify via FS.
  const putRes = await request({ method: 'PUT', url: base + '/_file?path=' + encodeURIComponent('file:///' + tmpSavePath.replace(/\\/g, '/')), body: saveBody });
  let readBack = '';
  try { readBack = fs.readFileSync(tmpSavePath, 'utf8'); } catch (e) { readBack = '<no file>'; }
  fs.unlinkSync(tmpSavePath);
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
  const js = await startServer('node', ['dawn_console.js'], { PORT: String(jsPort) });
  let dawn = null;
  try {
    const jsBase = `http://127.0.0.1:${jsPort}`;
    await waitFor('js', jsBase + '/environment.json', js.proc, js.errbuf);
    results = {};
    const jsResults = await runMatrix('js', jsBase, tmpSavePath, saveBody);

    // Dawn server — only if the Phase 3 entry point exists yet.
    const dawnEntry = path.join(ROOT, 'server', 'main.dawn');
    const dawnScheme = path.join(ROOT, 'dawn', 'Scheme', 'httpServer.dawn');
    if (fs.existsSync(dawnEntry) && fs.existsSync(dawnScheme)) {
      const dawnPort = jsPort + 1;
      dawn = await startServer('node', ['dawn_run.js', 'server/main.dawn'], { PORT: String(dawnPort) });
      const dawnBase = `http://127.0.0.1:${dawnPort}`;
      await waitFor('dawn', dawnBase + '/environment.json', dawn.proc, dawn.errbuf);
      results = {};
      const dawnResults = await runMatrix('dawn', dawnBase, tmpSavePath, saveBody);
      for (const name of Object.keys(jsResults)) {
        check('parity ' + name, JSON.stringify(dawnResults[name]), JSON.stringify(jsResults[name]));
      }
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
