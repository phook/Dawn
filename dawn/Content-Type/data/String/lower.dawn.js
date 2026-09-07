const Resource  = Dawn.require("Content-Type/data/Resource");

function lower()
{
	Resource.call(this,"lower");
	this.Processor=lowerProcessor;
	return this;
}

function lowerProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.in_String_$all = function(input)
	{
		return this?.out_String?.({value:input.value.toLowerCase()});
    }
}
lower.Processor=lowerProcessor;
module.exports=lower;