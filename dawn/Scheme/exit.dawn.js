const Resource = Dawn.require("Content-Type/data/Resource");

// exit:N — on go (or on a Number input) terminates the process with code N.
// exit: alone exits with 0.
function exit()
{
	Resource.call(this,"exit");
	this.Processor = exitProcessor;
	return this;
}

function exitProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	let code = 0;
	let armed = typeof process !== "undefined";

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		let n = parseInt(decodeURIComponent(input.value || ""));
		newObject.code = isNaN(n) ? 0 : n;
		return newObject.instanciate_processor();
	};
	code = resource.code || 0;

	this.in_Number_$all = function(input) { code = input.value; };
	

	this.in_go = function()
	{
		if (armed) process.exit(code);
	};
	return this;
}
exit.Processor = exitProcessor;
module.exports = exit;