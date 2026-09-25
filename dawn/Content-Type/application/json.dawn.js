const Resource  = Dawn.require("Content-Type/data/Resource");

// Content-Type/application/json — parsed JSON data from bytes.
function json()
{
	Resource.call(this,"json");
	this.Processor = jsonProcessor;
	return this;
}

function jsonProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_Data = null;
	this.in_octetstream_$all = function(input)
    {
		let u8 = input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value);
		let text = new TextDecoder().decode(u8);
		try { resource.value = JSON.parse(text); }
		catch (e) { resource.value = text; }
    }
	this.in_go = function()
    {
		return this.out_Data?.(resource);
    }
	this.in_instanciate = function(input)
    {
		let newObject = this.get_resource().clone();
		return newObject.instanciate_processor();
    }
	return this;
}
json.Processor=jsonProcessor;
module.exports=json;