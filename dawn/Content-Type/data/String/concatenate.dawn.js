const Resource  = Dawn.require("Content-Type/data/Resource");

function concatenate()
{
	Resource.call(this,"concatenate");
	this.Processor=concatenateProcessor;
	return this;
}

function concatenateProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.in_begin = function()
	{
		this.tempString = ""; 
    }
	this.in_String_$all = function(input)
    {   
      this.tempString += input.value;
    }
	this.in_end = function()
    {
        this?.out_String({value:this.tempString}); 
    }
}
concatenate.Processor=concatenateProcessor;
module.exports=concatenate;
