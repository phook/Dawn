const Resource = Dawn.require("Content-Type/data/Resource");

// httpHello — minimal native handler proving the httpServer scheme binding:
// receives the request's octetstream body and returns the response String.
function httpHello()
{
	Resource.call(this,"httpHello");
	this.Processor = httpHelloProcessor;
	return this;
}

function httpHelloProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.in_request_headers = function(input)
	{
		// meta arrives before the body — handy for routing later
	};
	this.in_request_octetstream = function(input)
	{
		const StringRes = Dawn.require("Content-Type/data/String");
		console.log("HTTPHELLO handler fired");
		let s = new StringRes();
		s.value = "hello from dawn httpServer";
		return s;
	};
	return this;
}
httpHello.Processor = httpHelloProcessor;
module.exports = httpHello;