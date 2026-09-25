const Resource  = Dawn.require("Content-Type/data/Resource");

// Content-Type/text — family main for text/*: strings from bytes (UTF-8).
// Found in the dawn tree by Scheme/cast when a mimetype resolves to this
// family; subtype files (Content-Type/text/html etc.) can override.
function text()
{
	Resource.call(this,"text");
	this.Processor = textProcessor;
	return this;
}

function textProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_String = null;
	this.in_octetstream_$all = function(input)
    {
		let u8 = input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value);
		resource.value = new TextDecoder().decode(u8);
    }
	this.in_go = function()
    {
		return this.out_String?.(resource);
    }
	this.in_instanciate = function(input)
    {
		let newObject = this.get_resource().clone();
		newObject.value = "";
		return newObject.instanciate_processor();
    }
	return this;
}
text.Processor=textProcessor;
module.exports=text;