const { spawn } = require('child_process');
const http = require('http');
const p = spawn('node', ['dawn_run.js', 'server/main.dawn'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
let buf = '';
p.stdout.on('data', d => { buf += d; console.log('[out]', d.toString().trim()); });
p.stderr.on('data', d => console.log('[err]', d.toString().trim()));
p.on('exit', c => console.log('exit', c));
function req(url) {
  return new Promise((res2, rej) => {
    const r = http.request(url, { method: 'GET' }, x => {
      const c = []; x.on('data', d2 => c.push(d2));
      x.on('end', () => res2({ status: x.statusCode, ct: x.headers['content-type'], body: Buffer.concat(c).toString() }));
    });
    r.on('error', rej); r.end();
  });
}
const iv = setInterval(async () => {
  const m = buf.match(/listening on port (\d+)/);
  if (!m) return;
  clearInterval(iv);
  try { const a = await req('http://127.0.0.1:' + m[1] + '/anything'); console.log('GET =>', JSON.stringify(a)); }
  catch (e) { console.log('req err', e.message); }
  p.kill(); process.exit(0);
}, 100);
