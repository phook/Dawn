const Resource = Dawn.require('./dawn/Resource.js');

function or()
{
	Resource.call(this,"or");
	this.Processor=orProcessor;
	return this;
}

function orProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Boolean = null;
	this._in_begin = function()
	{
		this._tempBoolean = false; 
    }
	this._in_Boolean_$ = function(input)
    {   
      this._tempBoolean |= input._value;
    }
	this._in_end = function()
    {
        this?._out_Boolean({_value:this._tempBoolean}); 
    }
}
or.Processor=orProcessor;
module.exports=or;
