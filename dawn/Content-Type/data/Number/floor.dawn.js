const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function floor()
{
  this.Number = new Number();
	Resource.call(this,"floor");
	this.Processor=floorProcessor;
	return this;
}

function floorProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_Number_$all = function(input)
	{
		return this?.out_Number?.({value:input.value.floor()});
    }
}
floor.Processor=floorProcessor;
module.exports=floor;