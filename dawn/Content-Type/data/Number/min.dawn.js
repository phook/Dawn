const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function min()
{
  this.Number = new Number();
	Resource.call(this,"min");
	this.Processor=minProcessor;
	return this;
}

function minProcessor(resource)
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
		if (this.tempNumber == null || input.value.compare(this.tempNumber) < 0)
			this.tempNumber = input.value;
    }
	this.in_end = function()
	{
		if (this.tempNumber != null)
			return this?.out_Number?.({value:this.tempNumber});
    }
}
min.Processor=minProcessor;
module.exports=min;