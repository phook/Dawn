const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function round()
{
  this.Number = new Number();
	Resource.call(this,"round");
	this.Processor=roundProcessor;
	return this;
}

function roundProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_Number_$all = function(input)
	{
		return this?.out_Number?.({value:input.value.round()});
    }
}
round.Processor=roundProcessor;
module.exports=round;