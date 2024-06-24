let Dawn = require("./Dawn.js");
//let BNFT = require("./BNFT/BNFT.js");
let DawnCompiler = require("./DawnCompiler.js");
Dawn.initialize(".",null,false);
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
/*
let DawnParserSource = Dawn.resourceAsString("dawn/Flavors/dawn.BNFT");
let DawnParser = new BNFT(DawnParserSource,{alert:console.log,fileToString: Dawn.resourceAsString,path:"dawn/Flavors/",useCache:true});

let code = DawnParser.parse(source,{alert:console.log,fileToString: Dawn.resourceAsString,path:".",useCache:true, nonterminal:"PROGRAMBODY"});

//console.log(code);

//let fn = new Function("scope" , "return " + code);
let programLines = new Function("scope" , code)();

let program = Dawn.return_executable_function.call(Dawn,programLines);
program.call(Dawn,arguments);
*/

function evalInContext(js, context) {
  return function() {
    return eval(js);
  }.call(context);
}

let jsSource = (new DawnCompiler).parse(source);
if (jsSource != "ERROR")
{
	let program_lines = evalInContext(jsSource,Dawn);
	let processor = Dawn._instanciate_processor();
	processor._execute(processor,program_lines);
}

