const Resource  = Dawn.require("Content-Type/data/Resource");

// Binary byte array — the universal transport value. Holds a JavaScript
// Uint8Array (a server Buffer is one). http:, file: and Scheme/cast produce
// octetstreams for binary content; the octetstream interface
// (in_octetstream_$all / out_octetstream) is how every value resource
// converts to and from bytes.
function octetstream()
{
	Resource.call(this,"octetstream");
	this.Processor = octetstreamProcessor;
	return this;
}

function octetstreamProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_octetstream = null;
	this.in_octetstream_$all = function(input)
    {
		resource.value = input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value);
    }
	this.in_go = function()
    {
		return this.out_octetstream?.(resource);
    }
	this.in_instanciate = function(input)
    {
		let newObject = this.get_resource().clone();
		newObject.value = new Uint8Array(0);
		return newObject.instanciate_processor();
    }
	return this;
}
octetstream.Processor=octetstreamProcessor;
module.exports=octetstream;