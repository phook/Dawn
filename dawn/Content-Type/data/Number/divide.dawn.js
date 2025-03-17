const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function div()
{
  this.Number = new Number();
	Resource.call(this,"div"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=divProcessor;
	return this;
}

function divProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = new resource.Number.bigRat(0,10);
	this._in_Number_dividend = function(input)
    { // raise error if not called?  
      this._tempNumber = input._value;
    }
	this._in_Number_$ = function(input)
    {   
      this._tempNumber = this._tempNumber.divide(input._value);
    }
	this._in_end = function()
    {
        this?._out_Number({_value:this._tempNumber}); 
    }
}
div.Processor=divProcessor;
module.exports=div;
