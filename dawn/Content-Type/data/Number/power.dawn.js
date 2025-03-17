const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function power()
{
  this.Number = new Number();
	Resource.call(this,"power"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=powerProcessor;
	return this;
}

function powerProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = new resource.Number.bigRat(0,10);
	this._in_Number_base = function(input)
    { // raise error if not called?  
      this._tempNumber = input._value;
    }
	this._in_Number_$ = function(input)
    {  
		if (this._tempNumber)
			this._tempNumber = this._tempNumber.pow(input._value);
		else
			this._tempNumber = input._value;
    }
	this._in_end = function()
    {
        this?._out_Number({_value:this._tempNumber}); 
    }
}
power.Processor=powerProcessor;
module.exports=power;
