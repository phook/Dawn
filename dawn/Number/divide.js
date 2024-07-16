const Resource = Dawn.require('./dawn/Resource.js');

function div()
{
	Resource.call(this,"div"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=divProcessor;
	return this;
}

function divProcessor(resource)
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
      this._tempNumber = this._tempNumber.div(input._value);
    }
	this._in_end = function()
    {
	  if (this._out_Number)
        this._out_Number({_value:this._tempNumber}); // WRONG - MUST BE STRING
    }
}
div.Processor=divProcessor;
module.exports=div;
