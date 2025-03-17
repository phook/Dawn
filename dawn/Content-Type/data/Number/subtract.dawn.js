const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function sub()
{
  this.Number = new Number();
	Resource.call(this,"sub"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=subProcessor;
	return this;
}

function subProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = new resource.Number.bigRat(0,10);
	this._in_Number_minuend = function(input)
    { // raise error if not called?  
      this._tempNumber = input._value;
    }
	this._in_Number_$ = function(input)
    { // raise error if not called at least once?  
      this._tempNumber = this._tempNumber.subtract(input._value);
    }
	this._in_end = function()
    {
        return this?._out_Number({_value:this._tempNumber}); 
    }
}
sub.Processor=subProcessor;
module.exports=sub;
