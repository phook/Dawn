const Resource = Dawn.require('./dawn/Resource.js');

function and()
{
	Resource.call(this,"and");
	this.Processor=andProcessor;
	return this;
}

function andProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Boolean = null;
	this._in_begin = function()
	{
		this._tempBoolean = true; 
    }
	this._in_Boolean_$ = function(input)
    {   
		this._tempBoolean &= input._value;
    }
	this._in_end = function()
    {
		this?._out_Boolean({_value:this._tempBoolean}); 
    }
}
and.Processor=andProcessor;
module.exports=and;
