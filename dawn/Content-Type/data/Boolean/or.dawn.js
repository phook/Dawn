const Resource  = Dawn.require("Content-Type/data/Resource");

function or()
{
	Resource.call(this,"or");
	this.Processor=orProcessor;
	return this;
}

function orProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Boolean = null;
	this.in_begin = function()
	{
		this.tempBoolean = false; 
    }
	this.in_Boolean_$all = function(input)
    {   
      this.tempBoolean |= input.value;
    }
	this.in_end = function()
    {
        this?.out_Boolean({value:this.tempBoolean}); 
    }
}
or.Processor=orProcessor;
module.exports=or;
