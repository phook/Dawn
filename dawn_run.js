let Dawn = require("./Dawn.js");
let BNFT = require("./BNFT/BNFT.js");
Dawn.initialize(".");
Dawn.print = console.log;

let arguments = process.argv.slice(2)

if (arguments.length != 1)
{
    console.log("USAGE: dawn.bat <filename>");
    process.exit();
}
let fileName = arguments[0]; 
let source = Dawn.resourceAsString(fileName);

//console.log(source);

let DawnParserSource = Dawn.resourceAsString("dawn/Flavors/dawn.BNFT");
let DawnParser = new BNFT(DawnParserSource,{alert:console.log,fileToString: Dawn.resourceAsString,path:".",useCache:true});

let code = DawnParser.parse(source,{alert:console.log,fileToString: Dawn.resourceAsString,path:".",useCache:true, nonterminal:"PROGRAMBODY"});

//console.log(code);

let fn = new Function("scope" , "return " + code);

//console.log(Dawn);

let pipe = fn(Dawn);

//console.log(pipe);

pipe._in_go();

