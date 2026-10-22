// dawn.js — the Dawn entry point (Node). Runs a .dawn program; the server is
// `node dawn.js server/main.dawn`. (Formerly dawn_run.js — retired to Dump/
// at the Phase 3 cutover.)
const __nodePath = require('path');
const __nodeFs   = require('fs');
const __ROOT     = __nodePath.resolve(__dirname);

const Dawn = require("./public/dawn.js");

// Expose Dawn as a global so .dawn.js resource files can reference it
// (they're authored for the browser where Dawn is always a global).
global.Dawn = Dawn;

const DawnCompiler = require("./dawn/DawnCompiler.dawn.js");

// Patch Dawn.require for server-side path resolution.
// public/dawn.js's server branch only does require(url) with no path lookup,
// so Dawn resource names like "Content-Type/data/Resource" never resolve.
const __origRequire = Dawn.require.bind(Dawn);
Dawn.require = function serverRequire(url) {
    if (Dawn.isBrowser()) return __origRequire(url);

    if (!Dawn.__cache) Dawn.__cache = {};
    if (url in Dawn.__cache) return Dawn.__cache[url];

    const tryRequire = (abs) => {
        try { return require(abs); } catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') throw e;
        }
    };

    let result;

    if (!url.startsWith('./') && !url.startsWith('../') && !__nodePath.isAbsolute(url)) {
        // Dawn resource name (e.g. "Content-Type/data/Resource", "fs", "path")
        const dawnBase = __nodePath.join(__ROOT, 'dawn', url);
        result = tryRequire(dawnBase + '.dawn.js')
              || tryRequire(dawnBase + '.js')
              || tryRequire(dawnBase)
              || tryRequire(url);          // Node built-ins / node_modules
    } else {
        // Relative path — resolve from project root, not from public/dawn.js
        const absBase = __nodePath.resolve(__ROOT, url).replace(/\.(dawn\.js|js)$/, '');
        result = tryRequire(absBase + '.dawn.js')
              || tryRequire(absBase + '.js')
              || tryRequire(absBase);
        if (!result) {
            // Also try inside dawn/ (e.g. "./DawnCompiler.js" → dawn/DawnCompiler.dawn.js)
            const dawnBase = __nodePath.resolve(__ROOT, 'dawn', url.replace(/^\.\//, '')).replace(/\.(dawn\.js|js)$/, '');
            result = tryRequire(dawnBase + '.dawn.js')
                  || tryRequire(dawnBase + '.js')
                  || tryRequire(dawnBase);
        }
    }

    if (result !== undefined) Dawn.__cache[url] = result;
    return result;
};

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log("USAGE: node dawn.js <filename>");
    process.exit(1);
}

Dawn.print = console.log;

async function main() {
    await Dawn.initialize("./dawn");

    // Local scheme dir: a `scheme/` folder next to the running file is added to
    // the lookup tree, so its resources resolve as `scheme.<Name>:` (app-level
    // schemes stay out of the dawn/ standard library).
    const localSchemeDir = __nodePath.join(__nodePath.dirname(__nodePath.resolve(args[0])), 'scheme');
    if (__nodeFs.existsSync(localSchemeDir)) {
        const FileScheme = Dawn.require("Scheme/file");
        const schemeFile = new FileScheme("scheme", localSchemeDir.replace(/\\/g, '/'));
        const schemeResource = (await schemeFile.instanciate_processor().in_instanciate()).get_resource();
        Dawn.instanciate_processor().add(schemeResource);
    }

    const source = Dawn.resourceAsString(args[0]);
    const jsSource = (new DawnCompiler).parse(source);

    if (jsSource !== "ERROR") {
        const processor = Dawn.instanciate_processor();
        const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;
        const list = await (new AsyncFn("return " + jsSource)).call(processor);
        if (list) list.in_go();
    }
}

main().catch(console.error);
