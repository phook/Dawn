const Resource  = Dawn.require("Content-Type/data/Resource");

function _if()
{
	Resource.call(this,"if");
	this.Processor=ifProcessor;
	return this;
}

function ifProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_go_then = null;
	this.out_go_else = null;
	this.in_Boolean_$all = function(input)
    {
	  if (input.value)
		this?.out_go_then();
	  else
		this?.out_go_else();
    }
}
_if.Processor=ifProcessor;
module.exports=_if;
