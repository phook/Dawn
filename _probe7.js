const path = require('path');
const ROOT = process.cwd();
const Dawn = require('./public/dawn.js');
global.Dawn = Dawn;
(async () => {
  const o = Dawn.require.bind(Dawn);
  Dawn.require = function (u) {
    if (!Dawn.__c) Dawn.__c = {};
    if (u in Dawn.__c) return Dawn.__c[u];
    const tr = (a) => { try { return require(a); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } };
    let r;
    if (!u.startsWith('./') && !u.startsWith('../') && !path.isAbsolute(u)) r = tr(path.join(ROOT, 'dawn', u) + '.dawn.js') || tr(path.join(ROOT, 'dawn', u) + '.js') || tr(path.join(ROOT, 'dawn', u)) || tr(u);
    else r = tr(path.resolve(ROOT, u));
    if (r !== undefined) Dawn.__c[u] = r;
    return r;
  };
  await Dawn.initialize('./dawn');
  const root = Dawn.instanciate_processor();

  console.log('lookup httpServer:0 ...');
  const srv = await root.lookup('httpServer:0');
  console.log('  ->', srv && srv.get_resource().name, 'port=', srv.get_resource().port);

  console.log('lookup Console: ...');
  const con = await Promise.race([root.lookup('Console:'), new Promise(r => setTimeout(() => r('TIMEOUT'), 3000))]);
  console.log('  ->', con === 'TIMEOUT' ? 'TIMEOUT' : (con && con.get_resource().name));

  console.log('connect srv -> con ...');
  if (con !== 'TIMEOUT') {
    srv.connect(con);
    console.log('  bound out_request_octetstream:', typeof srv.out_request_octetstream);
    console.log('  outputs offered:', Object.keys(srv.outputList || {}));
  }
  process.exit(0);
})();
