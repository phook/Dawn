const Resource  = Dawn.require("Content-Type/data/Resource");

function compare()
{
	Resource.call(this,"compare");
	this.Processor=compareProcessor;
	return this;
}

function compareProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Boolean = null;
	this.in_String_comparee = function(input)
	{
		this.tempString = input.value; 
    }
	this.in_String_$all = function(input)
    {   
      this?.out_Boolean({value:this.tempString === input.value}); 
    }
}
compare.Processor=compareProcessor;
module.exports=compare;
