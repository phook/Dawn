/* BNFTLoader — just-in-time loading for compiled BNFT flavor parsers.
 *
 * Mirrors how Dawn resources load: the source of truth is the .bnft grammar;
 * the compiled parser lives next to it as .bnft.js. On load, the artifact is
 * compiled when missing and recompiled when its mtime differs from the
 * source's (same staleness convention as build_sources.js), or always when
 * compileOptions.force is set — needed after editing BNFT_runtime.js, whose
 * code is inlined INTO every artifact and is invisible to the javac-style
 * mtime parity check on flavors. Recompiled artifacts are stamped with the
 * source's timestamp and marked hidden.
 *
 *   loadFlavorClass('basic')  -> compiled parser constructor
 *   ensureFlavorArtifacts()   -> precompile every dawn/Flavors/*.bnft
 *
 * Browser code does NOT use this loader: artifacts are prebuilt (either by
 * ensureFlavorArtifacts at build time or by the server at first save) and
 * loaded through Dawn.require('Flavors/<name>.bnft.js').
 */
const path = require('path');
const { compile } = require('../BNFT/BNFT_to_JS.js');

const FLAVORS_DIR = path.join(__dirname, 'Flavors');

const STALE_TOLERANCE_MS = 1;

function artifactPath(name) {
    return path.join(FLAVORS_DIR, name + '.bnft.js');
}

function sourcePathOf(name) {
    return path.join(FLAVORS_DIR, name + '.bnft');
}

function isArtifactFresh(sourcePath, artifactUrl, force) {
    if (force) {
        return false;
    }
    let artifactStat;
    try {
        artifactStat = require('fs').statSync(artifactUrl);
    } catch (e) {
        return false; // missing artifact
    }
    const sourceStat = require('fs').statSync(sourcePath);
    return Math.abs(artifactStat.mtimeMs - sourceStat.mtimeMs) < STALE_TOLERANCE_MS;
}

// returns the compiled parser constructor; JIT-compiles the artifact when
// missing or stale (or compileOptions.force), then (and only then) reloads it
// into the require cache
function loadFlavorClass(name, compileOptions) {
    const sourcePath = sourcePathOf(name);
    const artifactUrl = path.resolve(artifactPath(name));
    const force = !!(compileOptions && compileOptions.force);

    let recompiled = false;
    if (!isArtifactFresh(sourcePath, artifactUrl, force)) {
        const result = compile(sourcePath, artifactUrl, compileOptions);
        if (result === 'ERROR') {
            const error = new Error('BNFT flavor "' + name + '" failed to compile');
            error.flavor = name;
            throw error;
        }
        recompiled = true;
    }

    // after a recompile the require cache holds the stale artifact — reload it
    if (recompiled && require.cache[artifactUrl]) {
        delete require.cache[artifactUrl];
    }
    return require(artifactUrl);
}

// precompile every grammar in dawn/Flavors (build step + server bootstrap)
function ensureFlavorArtifacts(compileOptions) {
    const fs = require('fs');
    const names = fs.readdirSync(FLAVORS_DIR)
        .filter(f => f.endsWith('.bnft'))
        .map(f => f.substring(0, f.length - '.bnft'.length))
        .sort();

    const built = [];
    const force = !!(compileOptions && compileOptions.force);
    for (const name of names) {
        const sourcePath = sourcePathOf(name);
        const artifactUrl = path.resolve(artifactPath(name));
        if (isArtifactFresh(sourcePath, artifactUrl, force)) continue;
        const result = compile(sourcePath, artifactUrl, compileOptions);
        if (result === 'ERROR') {
            const error = new Error('BNFT flavor "' + name + '" failed to compile');
            error.flavor = name;
            throw error;
        }
        built.push(name);
    }
    return built;
}

module.exports = { loadFlavorClass, ensureFlavorArtifacts, isArtifactFresh, artifactPath };
