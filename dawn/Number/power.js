const Resource = Dawn.require('./dawn/Resource.js');

function power()
{
	Resource.call(this,"power"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=powProcessor;
	return this;
}

function powerProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = null; // NOT CORRECT - MUST BE STRING
	this._in_begin = function()
	{
		this._tempNumber=null;
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
        this?._out_Number({_value:this._tempNumber}); // WRONG - MUST BE STRING
    }
}
power.Processor=powerProcessor;
module.exports=power;
