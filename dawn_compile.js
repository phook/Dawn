let Dawn = require("./Dawn.js");
let BNFT = require("./BNFT/BNFT.js");
Dawn.initialize(".");
Dawn.print = console.log;

let arguments = process.argv.slice(2)

if (arguments.length != 1)
{
    console.log("USAGE: dawn_compile.bat <filename>");
    process.exit();
}
let fileName = arguments[0]; 
var dawnSource = Dawn.resourceAsString(fileName);
if (fileName.endsWith(".dawn_basic"))
{
    fileName = fileName.replace(".dawn_basic",".js");
    var flavor = "basic"; //full_name.substring(full_name.indexOf(".dawn_")+6);
    if (!Dawn.flavor_parser)
    {
        var source = Dawn.resourceAsString("dawn/Flavors/" + flavor + ".bnft");
        Dawn.flavor_parser = new BNFT(source, {alert:console.log, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});
    }
    dawnSource = Dawn.flavor_parser.parse(dawnSource,{alert:console.log, fileToString: Dawn.resourceAsString,nonterminal:"TO_DAWN"});
}
else
    fileName = fileName.replace(".dawn",".dawn.js");
console.log(dawnSource);

var dawnModuleParserSource = Dawn.resourceAsString("dawn/Flavors/dawn_to_node_module.bnft");
var moduleParser = new BNFT(dawnModuleParserSource, {alert:console.log, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});

var jsSource = moduleParser.parse(dawnSource,{alert:console.log,nonterminal:"MODULE"});
console.log(jsSource);
if (jsSource != "ERROR")
{
    Dawn.saveStringResource(fileName,jsSource,true);
}
