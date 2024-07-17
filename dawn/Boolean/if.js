const Resource = Dawn.require('./dawn/Resource.js');

function _if()
{
	Resource.call(this,"if");
	this.Processor=notProcessor;
	return this;
}

function ifProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_go_then = null;
	this._out_go_else = null;
	this._in_Boolean_$ = function(input)
    {
	  if (input._value)
		this?._out_go_then();
	  else
		this?._out_go_else();
    }
}
_if.Processor=ifProcessor;
module.exports=_if;
