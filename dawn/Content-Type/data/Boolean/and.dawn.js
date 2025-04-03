const Resource  = Dawn.require("Content-Type/data/Resource");

function and()
{
	Resource.call(this,"and");
	this.Processor=andProcessor;
	return this;
}

function andProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Boolean = null;
	this.in_begin = function()
	{
		this.tempBoolean = true; 
    }
	this.in_Boolean_$all = function(input)
    {   
		this.tempBoolean &= input.value;
    }
	this.in_end = function()
    {
		this?.out_Boolean({value:this.tempBoolean}); 
    }
}
and.Processor=andProcessor;
module.exports=and;
