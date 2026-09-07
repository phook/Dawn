const Resource  = Dawn.require("Content-Type/data/Resource");

function upper()
{
	Resource.call(this,"upper");
	this.Processor=upperProcessor;
	return this;
}

function upperProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.in_String_$all = function(input)
	{
		return this?.out_String?.({value:input.value.toUpperCase()});
    }
}
upper.Processor=upperProcessor;
module.exports=upper;