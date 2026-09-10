const Resource  = Dawn.require("Content-Type/data/Resource");

// Content-Type/image — family main for image/*: the raw bytes as a Blob,
// until a typed Image resource lands at Content-Type/image (subtypes like
// Content-Type/image/png can override by dropping a file in that folder).
function image()
{
	Resource.call(this,"image");
	this.Processor = imageProcessor;
	return this;
}

function imageProcessor(resource)
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
	this.in_instanciate = function(input)
    {
		let newObject = this.get_resource().clone();
		newObject.value = new Uint8Array(0);
		return newObject.instanciate_processor();
    }
	return this;
}
image.Processor=imageProcessor;
module.exports=image;