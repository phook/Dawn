const Resource = Dawn.require('./dawn/Resource.js');

function not()
{
	Resource.call(this,"not");
	this.Processor=notProcessor;
	return this;
}

function notProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Boolean = null;
	this._in_Boolean_$ = function(input)
    {   
        this?._out_Boolean({_value:!input._value}); 
    }
}
not.Processor=notProcessor;
module.exports=not;
