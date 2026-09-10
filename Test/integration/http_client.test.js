// Integration test: http: client scheme against a real local server.
// Async spawn (never execSync — the fixture server lives in this process's loop).
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');
const srv = http.createServer((req, res) => {
  if (req.url === '/hello') { res.writeHead(200, {'content-type':'text/plain'}); res.end('hi from dawn'); return; }
  if (req.url === '/oops') { res.writeHead(404); res.end('nope'); return; }
  if (req.url === '/img') { res.writeHead(200, {'content-type':'image/png'}); res.end(Buffer.from([137,80,78,71])); return; }
  res.writeHead(200); res.end('root');
});

let failures = 0, successes = 0;
function check(name, actual, expected) {
  if (actual === expected) { console.log('PASS:', name); successes++; }
  else { console.log('FAIL:', name); console.log('  expected:', JSON.stringify(expected)); console.log('  actual:  ', JSON.stringify(actual)); failures++; }
}

function runCase(source) {
  return new Promise((resolve) => {
    const tmp = path.join(os.tmpdir(), `dawn_http_${Date.now()}_${Math.floor(Math.random()*1e6)}.dawn`);
    fs.writeFileSync(tmp, source);
    const p = spawn('node', [path.join(ROOT, 'dawn_run.js'), tmp], { cwd: ROOT });
    let buf = '';
    p.stdout.on('data', d => buf += d);
    p.stderr.on('data', d => buf += d);
    p.on('close', () => { fs.unlinkSync(tmp); resolve(buf.trimEnd()); });
    setTimeout(() => { try { p.kill(); } catch(e){} resolve(buf.trimEnd()); }, 15000);
  });
}

srv.listen(0, '127.0.0.1', async () => {
  const port = srv.address().port;
  check('http body',  await runCase(`http:127.0.0.1:${port}/hello>>Console:`), 'hi from dawn');
  check('http error', await runCase(`http:127.0.0.1:${port}/oops>>Console:`), 'http: status 404 for http://127.0.0.1:' + port + '/oops');
  check('http binary', await runCase(`http:127.0.0.1:${port}/img>>Console:`), 'Blob(4 bytes)');
  srv.close();
  console.log(`${successes} passed, ${failures} failed (integration)`);
  process.exit(failures ? 1 : 0);
});
