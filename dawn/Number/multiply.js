const Resource = Dawn.require('./dawn/Resource.js');

function mul()
{
	Resource.call(this,"mul"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=mulProcessor;
	return this;
}

function mulProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = new Dawn.bigRat(0,10);; // NOT CORRECT - MUST BE STRING
	this._in_begin = function()
	{
		this._tempNumber=Dawn.bigRat(0, 10)
    }
	this._in_Number_$ = function(input)
    {   
      this._tempNumber = this._tempNumber.mul(input._value);
    }
	this._in_end = function()
    {
        this?._out_Number({_value:this._tempNumber}); // WRONG - MUST BE STRING
    }
}
mul.Processor=mulProcessor;
module.exports=mul;
