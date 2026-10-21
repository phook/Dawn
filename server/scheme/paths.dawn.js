const Resource = Dawn.require("Content-Type/data/Resource");
const os = require("node:os");
const path = require("node:path");

// paths: — TEMPORARY native stopgap: dawnPath/userPath sources (the identical
// strings dawn_console.js serves), until a proper paths design lands.
// in_go fires dawnPath then userPath and returns the LAST emit's result,
// so a reply chain (>> json:environment) threads the final record out.
function paths()
{
	Resource.call(this,"paths");
	this.Processor = pathsProcessor;
	return this;
}

function pathsProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_String_dawnPath = null;
	this.out_String_userPath = null;

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		return newObject.instanciate_processor();
	};

	this.in_go = function()
	{
		const repoRoot = path.resolve(__dirname, "..", "..");
		const dawnPath = ("file:///" + path.join(repoRoot, "dawn")).replaceAll("\\", "/");
		const userPath = "file:///" + os.homedir().replaceAll("\\", "/");
		this.out_String_dawnPath?.({ value: dawnPath });
		this.out_String_userPath?.({ value: userPath });
	};
	return this;
}
paths.Processor=pathsProcessor;
module.exports=paths;