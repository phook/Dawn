const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function mul()
{
  this.Number = new Number();
	Resource.call(this,"mul"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=mulProcessor;
	return this;
}

function mulProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = new resource.Number.bigRat(1,1);
	this._in_begin = function()
	{
		this._tempNumber=resource.Number.bigRat(1,1);
    }
	this._in_Number_$ = function(input)
    {   
      this._tempNumber = this._tempNumber.multiply(input._value);
    }
	this._in_end = function()
    {
        this?._out_Number({_value:this._tempNumber}); // WRONG - MUST BE STRING
    }
}
mul.Processor=mulProcessor;
module.exports=mul;
