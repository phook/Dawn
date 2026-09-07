const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function modulo()
{
  this.Number = new Number();
	Resource.call(this,"modulo");
	this.Processor=moduloProcessor;
	return this;
}

function moduloProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_begin = function()
	{
		this.tempNumber = null;
    }
	this.in_Number_dividend = function(input)
	{ // first number in the flow is the dividend
		this.tempNumber = input.value;
    }
	this.in_Number_$all = function(input)
	{ // each following number is a divisor, applied in turn
		this.tempNumber = this.tempNumber.mod(input.value);
    }
	this.in_end = function()
	{
		if (this.tempNumber != null)
			return this?.out_Number?.({value:this.tempNumber});
    }
}
modulo.Processor=moduloProcessor;
module.exports=modulo;