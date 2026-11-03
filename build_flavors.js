// build_flavors.js — generate compiled BNFT flavor artifacts (.bnft.js).
//
// Source of truth = the .bnft grammar. The artifact is a self-contained
// parser (BNFT_runtime.js + the grammar's serialized expression tree) written
// next to the source ONLY when stale (mtime differs), then stamped with the
// SOURCE's timestamp (stale ⟺ source touched since last build) and marked
// hidden — the same convention as build_sources.js for .dawn.js.
//
// `node build_flavors.js --force`: rebuild even when fresh. REQUIRED after
// editing BNFT/BNFT_runtime.js — the runtime's code is inlined into every
// artifact, so the .bnft-vs-.bnft.js mtime parity check cannot see engine
// changes.
const { ensureFlavorArtifacts } = require('./dawn/BNFTLoader.js');

const force = process.argv.includes('--force');

let built;
try {
    built = ensureFlavorArtifacts(force ? { force: true } : undefined);
} catch (e) {
    console.log(`ERROR: ${e.message}`);
    process.exit(1);
}

if (built.length) {
    built.forEach((name) => console.log(`BUILT: dawn/Flavors/${name}.bnft.js`));
} else {
    console.log('flavors: all artifacts fresh');
}
console.log(`${built.length} built from dawn/Flavors/*.bnft`);
