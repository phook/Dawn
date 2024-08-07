const Dawn = require("./Dawn.js");
Dawn.initialize(".",null,false);
const bnft = Dawn.require("./BNFT/BNFT.js");





/// FLAVOR BEGIN

if (!Dawn.flavor_parser)
{
	var source = Dawn.resourceAsString("dawn/Flavors/basic.bnft");
	Dawn.flavor_parser = new bnft(source, {alert:console.log, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});
}
let flavorSource = "define SourceTest\n{\n"+Dawn.resourceAsString("test/SourceTest.dawn_basic") + "\n}\n";
//let flavorSource = Dawn.resourceAsString("test/SourceTest.dawn_basic");
let dawnSource = Dawn.flavor_parser.parse(flavorSource,{alert:console.log, fileToString: Dawn.resourceAsString,nonterminal:"TO_DAWN"}); // 
if (dawnSource == "ERROR")
{
	throw "error in flavored dawn file: test/SourceTest.dawn_basic";
}
Dawn.saveStringResource("test/SourceTest.dawn",dawnSource,true)


/// FLAVOR END