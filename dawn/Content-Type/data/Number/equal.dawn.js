const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function equal()
{
  this.Number = new Number();
	Resource.call(this,"equal");
	this.Processor=equalProcessor;
	return this;
}

function equalProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Boolean = null;
	this.in_begin = function()
	{
		this.tempBoolean = true;
		this.previousNumber = null;
    }
	this.in_Number_$all = function(input)
    {   // chained comparison: true iff all inputs are equal
		if (this.previousNumber != null && this.previousNumber.compare(input.value) !== 0)
			this.tempBoolean = false;
		this.previousNumber = input.value;
    }
	this.in_end = function()
    {
        return this?.out_Boolean?.({value:this.tempBoolean}); 
    }
}
equal.Processor=equalProcessor;
module.exports=equal;