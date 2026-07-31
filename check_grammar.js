const fs = require('fs');
const content = fs.readFileSync('dawn/Flavors/basic.bnft', 'utf8');
const lines = content.split('\n');

// Find all defined nonterminals and their line numbers
const definitions = {}; // name -> array of start line numbers
const definitionOrder = [];
const nonTerminalRegex = /^([A-Z_][A-Z_0-9]*):/;

lines.forEach((line, i) => {
    const m = line.match(nonTerminalRegex);
    if (m) {
        const name = m[1];
        if (!definitions[name]) definitions[name] = [];
        definitions[name].push(i + 1); // 1-indexed
        if (definitions[name].length === 1) definitionOrder.push(name);
    }
});

// Find duplicates
const duplicates = Object.entries(definitions).filter(([_, lines]) => lines.length > 1);

// For each name, find all references (excluding its own definition lines)
const references = {};
function findRefs(target) {
    const refs = [];
    lines.forEach((line, i) => {
        if (line.trim().startsWith(target + ':')) return; // skip definition line
        const regex = new RegExp('\\b' + target + '\\b', 'g');
        let match;
        while ((match = regex.exec(line)) !== null) {
            refs.push({ line: i + 1, text: line.trim() });
        }
    });
    return refs;
}

console.log('=== Duplicates ===');
for (const [name, dlines] of duplicates) {
    console.log(`${name}:`);
    dlines.forEach(l => console.log(`  - line ${l}`));
}

console.log('\n=== Unused nonterminals ===');
for (const name of definitionOrder) {
    const refs = findRefs(name);
    if (refs.length === 0) {
        console.log(`  ${name}  (defined at line ${definitions[name][0]})`);
    } else {
        // Look in the data files or referenced names
        console.log(`  ${name} - used at:`);
        refs.slice(0, 3).forEach(r => console.log(`    line ${r.line}: ${r.text}`));
    }
}
