const fs = require('fs');
let s = fs.readFileSync('dawn/Scheme/dawn.dawn', 'utf8');
const m = s.match(/\[Native\.Javascript:([^\]]*)\]>>NewResource:(\S+)/);
let js = decodeURIComponent(m[1]);

// receiving the source IS the trigger in a flow (flows propagate through
// ports; element in_go only runs for the chain head). run on arrival.
js = js.replace(
  'this.in_String_$all = function(input) { source = input.value; };',
  [
    'let ran = false;',
    'this.in_String_$all = function(input) {',
    '	source = input.value;',
    '	this.run();',
    '};',
    'this.in_octetstream_$all = function(input)',
    '{',
    '	source = new TextDecoder().decode(input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value));',
    '	this.run();',
    '};'
  ].join('\n')
).replace(
  'this.in_go = function()',
  [
    'this.run = function()',
    '{',
    '	if (ran || !source) return;',
    '	ran = true;'
  ].join('\n')
) // close brace dance: the original in_go body becomes run body; keep in_go as fallback for URI-supplied source
;

// original body ended with '};' then 'return this;' - now in_go must call run when a URI supplied the source
js = js.replace(
  'minute_marker',
  'no such token'
);

// add in_go after the now-renamed run
js = js.replace(
  '	return this;\n}\ndawn.Processor = dawnProcessor;',
  [
    '	this.in_go = function()',
    '	{',
    '		this.run(); // URI-supplied source: nothing arrives through a port',
    '	};',
    '	return this;',
    '}',
    'dawn.Processor = dawnProcessor;'
  ].join('\n')
);

fs.writeFileSync('dawn/Scheme/dawn.dawn', s.slice(0, m.index) + '[Native.Javascript:' + encodeURIComponent(js) + ']>>NewResource:' + m[2] + s.slice(m.index + m[0].length));
console.log('dawn payload now runs on receipt');
