const Resource  = Dawn.require("Content-Type/data/Resource");

function concatenate()
{
	Resource.call(this,"concatenate");
	this.Processor=concatenateProcessor;
	return this;
}

function concatenateProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_String = null;
	this._in_begin = function()
	{
		this._tempString = ""; 
    }
	this._in_String_$ = function(input)
    {   
      this._tempString += input._value;
    }
	this._in_end = function()
    {
        this?._out_String({_value:this._tempString}); 
    }
}
concatenate.Processor=concatenateProcessor;
module.exports=concatenate;
