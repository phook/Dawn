var Fob = require("./dawn/Fob.js");
var fs = require('fs')
Dawn = {Fob:Fob};
function initialize(rootDir,server,evaluate)
{
    var Directory = require("./dawn/Directory.js");
    var bnft = require("./BNFT/BNFT.js");
    var bigRat = require("big-rational");
    var path = require('path')

    this.root = new Directory("Root",path.join(__dirname,"/dawn"));
    this.root.path.push("Dawn.");
    this.bigRat = bigRat;
    this.passedEval = evaluate ? evaluate : eval;
    this.server = server;

    this.fileToString = function(filename)
    {
        return fs.readFileSync(filename, {option:'utf8', function(err, source) {console.log("error reading "+filename);throw err;}}).toString();
    }

    this.bnft = bnft;
    this.parser = null;
    this.parser = new this.bnft(this.fileToString("dawn/Flavors/dawn.bnft"), console.log);

    var debug = true;

    if (debug)
        fs.writeFile('log.txt', '', function(){});

    function debugInfo(s)
    {
        if (debug)
            fs.appendFile('log.txt', s+"\n", function(){});
    }

    this.debugInfo = debugInfo;
}
Dawn.initialize = initialize;
module.exports = Dawn;