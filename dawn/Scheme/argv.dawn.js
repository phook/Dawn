const Resource = Dawn.require("Content-Type/data/Resource");
const StringRes = Dawn.require("Content-Type/data/String");

// argv:N — Nth command-line argument (process.argv[2+N] under `node
// dawn_run.js`); handed downstream as String on go. Empty when absent.
function argv()
{
	Resource.call(this,"argv");
	this.Processor = argvProcessor;
	return this;
}

function argvProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_String = null;
	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		newObject.index = parseInt(decodeURIComponent(input.value || "")) || 0;
		return newObject.instanciate_processor();
	};
	this.in_go = function()
	{
		const argv = (typeof process !== "undefined" && process.argv) ? process.argv.slice(3) : [];
		let s = new StringRes();
		s.value = argv[resource.index] === undefined ? "" : String(argv[resource.index]);
		this.out_String?.(s);
	};
	return this;
}
argv.Processor = argvProcessor;
module.exports = argv;