const fs = require('fs');
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
  const dc = new (Dawn.require('DawnCompiler.dawn.js'))();
  for (const src of ['String:Hello>>Console:\n', 'httpServer:0>>Console:\n']) {
    console.log('=== ' + src.trim());
    console.log(dc.parse(src));
  }
})();
