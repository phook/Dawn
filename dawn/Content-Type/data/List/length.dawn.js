const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

// INTERIM: length is conceptually an output of List (see docs/output-interfaces.md)
// implemented as an operator resource until named outputs/pins land.
// Counts the String/Number/Boolean elements of a flowing list.
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
	this.in_begin = function()
	{
		this.count = 0;
    }
	function count_element() { this.count++; } // no arrow closures - cloning breaks them
	this.in_String_$all = count_element;
	this.in_Number_$all = count_element;
	this.in_Boolean_$all = count_element;
	this.in_octetstream_$all = count_element;
	this.in_end = function()
	{
		return this?.out_Number?.({value:resource.Number.bigRat(this.count)});
    }
}
length.Processor=lengthProcessor;
module.exports=length;