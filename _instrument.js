const fs = require('fs');
let s = fs.readFileSync('dawn/Scheme/httpServer.dawn.js', 'utf8');
s = s.replace("if (self.out_request_headers)", "console.log('DBG ports:', Object.keys(self).filter(k=>k.startsWith('out_')).map(k=>k+'='+(self[k]?'BOUND':'null')).join(' ')); if (self.out_request_headers)");
s = s.replace("const bodyReply = await bodyPort(value);", "console.log('DBG firing for', value.get_resource().name); const bodyReply = await bodyPort(value); console.log('DBG bodyReply:', bodyReply && bodyReply.get_resource ? bodyReply.get_resource().name : typeof bodyReply);");
fs.writeFileSync('dawn/Scheme/httpServer.dawn.js', s);
console.log('instrumented');
