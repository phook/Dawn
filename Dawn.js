var Fob  = require("./dawn/Fob.js");
Dawn = {Fob:Fob};

// root should be protocol based - so directory does not have to be instanced.....Dawn js must resolve by itself somehow...
function initialize(root,evaluate)
{
    var isBrowser=new Function("try {return this===window;}catch(e){ return false;}");
    this.root = root;

    var bnft = require("./BNFT/BNFT.js");
    
    var bigRat = null;
    if (isBrowser)
        document.body.innnerHTML += '<script type="module">import bigRat from "https://jspm.dev/big-rational;Dawn.bigRat=bigRat";</script>';
    else
        bigRat = require("big-rational");

    this.bigRat = bigRat;
    this.passedEval = evaluate ? evaluate : eval;

    this.fileToString = function(filename)
    {
        return root.fileToString(filename);
    }

    this.bnft = bnft;
    this.parser = null;
    this.parser = new this.bnft(this.fileToString(root._get_qualified_name() + "/Flavors/dawn.bnft"), console.log);

    var debug = true;

    if (debug)
        root.writeFile('log.txt', '', function(){});

    function debugInfo(s)
    {
        if (debug)
            root.appendFile('log.txt', s+"\n", function(){});
    }

    this.debugInfo = debugInfo;
}
Dawn.initialize = initialize;
module.exports = Dawn;
