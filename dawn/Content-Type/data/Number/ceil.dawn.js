const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function ceil()
{
  this.Number = new Number();
	Resource.call(this,"ceil");
	this.Processor=ceilProcessor;
	return this;
}

function ceilProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_Number_$all = function(input)
	{
		return this?.out_Number?.({value:input.value.ceil()});
    }
}
ceil.Processor=ceilProcessor;
module.exports=ceil;