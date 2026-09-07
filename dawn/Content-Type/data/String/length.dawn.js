const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

// INTERIM: length is conceptually an output of String (see docs/output-interfaces.md)
// implemented as an operator resource until named outputs/pins land.
function length()
{
  this.Number = new Number();
	Resource.call(this,"length");
	this.Processor=lengthProcessor;
	return this;
}

function lengthProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_String_$all = function(input)
	{
		return this?.out_Number?.({value:resource.Number.bigRat(input.value.length)});
    }
}
length.Processor=lengthProcessor;
module.exports=length;