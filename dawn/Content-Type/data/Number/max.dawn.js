const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function max()
{
  this.Number = new Number();
	Resource.call(this,"max");
	this.Processor=maxProcessor;
	return this;
}

function maxProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_begin = function()
	{
		this.tempNumber = null;
    }
	this.in_Number_$all = function(input)
	{
		if (this.tempNumber == null || input.value.compare(this.tempNumber) > 0)
			this.tempNumber = input.value;
    }
	this.in_end = function()
	{
		if (this.tempNumber != null)
			return this?.out_Number?.({value:this.tempNumber});
    }
}
max.Processor=maxProcessor;
module.exports=max;