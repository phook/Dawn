const BNFT = require('./BNFT/BNFT.js');
const fs = require('fs');
const path = require('path');

const basicGrammar = fs.readFileSync('./dawn/Flavors/basic.bnft', 'utf8');

const parser = new BNFT(basicGrammar, {
    alert: (msg) => console.error('BNFT:', msg),
    fileToString: (url) => fs.readFileSync(path.resolve('./dawn/Flavors/', url), 'utf8'),
    path: 'dawn/Flavors/'
});

// Try converting basic to dawn
const basicSrc = '"Hello" String:concat>> Console:';
const dawnSrc = parser.parse(basicSrc, { nonterminal: 'TODAWN_COMMANDPROMT' });
console.log('BASIC input:', basicSrc);
console.log('BASIC->DAWN :', dawnSrc);

// Try round trip back to basic
const backBasic = parser.parse(dawnSrc, { nonterminal: 'FROMDAWN_COMMANDPROMT' });
console.log('DAWN->BASIC :', backBasic);

// Try same in reverse - dawn to basic
const dawnSrc2 = 'String:Hello>>Console:';
const basicVersion = parser.parse(dawnSrc2, { nonterminal: 'FROMDAWN_COMMANDPROMT' });
console.log('\nDAWN input :', dawnSrc2);
console.log('DAWN->BASIC :', basicVersion);

const basicToDawn = parser.parse(basicVersion, { nonterminal: 'TODAWN_COMMANDPROMT' });
console.log('BASIC->DAWN :', basicToDawn);
