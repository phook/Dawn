const Resource  = Dawn.require("Content-Type/data/Resource");

// Binary byte array — the universal transport value. Holds a JavaScript
// Uint8Array (a server Buffer is one). http:, file: and Scheme/cast produce
// Blobs for binary content; the blob interface (in_Blob_$all / out_Blob) is
// how every value resource converts to and from bytes.
function Blob()
{
	Resource.call(this,"Blob");
	this.Processor = BlobProcessor;
	return this;
}

function BlobProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_Blob = null;
	this.in_Blob_$all = function(input)
    {
		resource.value = input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value);
    }
	this.in_go = function()
    {
		return this.out_Blob?.(resource);
    }
	this.toBlob = function()
    {
		return resource.value;
    }
	this.in_instanciate = function(input)
    {
		let newObject = this.get_resource().clone();
		newObject.value = new Uint8Array(0);
		return newObject.instanciate_processor();
    }
	return this;
}
Blob.Processor=BlobProcessor;
module.exports=Blob;