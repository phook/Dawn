// debug resource: prints when its go fires — proves hello: resolved
function hello()
{
	Resource.call(this,"hello");
	this.Processor = helloProcessor;
	return this;
}

function helloProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.in_request_octetstream = function(input)
	{
		console.log("HELLO HANDLER CALLED");
	};
	this.in_go = function()
	{
		console.log("HELLO IN_GO FIRED");
	};
	return this;
}
hello.Processor = helloProcessor;
module.exports = hello;