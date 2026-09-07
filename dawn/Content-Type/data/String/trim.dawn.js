const Resource  = Dawn.require("Content-Type/data/Resource");

function trim()
{
	Resource.call(this,"trim");
	this.Processor=trimProcessor;
	return this;
}

function trimProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.in_String_$all = function(input)
	{
		return this?.out_String?.({value:input.value.trim()});
    }
}
trim.Processor=trimProcessor;
module.exports=trim;