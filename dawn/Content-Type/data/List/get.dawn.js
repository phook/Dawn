const Resource  = Dawn.require("Content-Type/data/Resource");

// Picks one element out of a flowing list by position (0-based).
// The first Number in the flow is the index; every other element is a
// candidate. The element is emitted with its own type.
// [String:a String:b String:c Number:1]>>List.get: emits "b" (as a String)
function get()
{
	Resource.call(this,"get");
	this.Processor=getProcessor;
	return this;
}

function getProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.out_Number = null;
	this.out_Boolean = null;
	this.in_begin = function()
	{
		this.index = null;
		this.elements = [];
		return this.fire_end_parameters(); // pre-positioned parameter inputs
    }
    function addElement(type)
    {
		return function(input) { this.elements.push({type:type, value:input.value}); };
    }
	this.in_Number_index = function(input)
    {
		this.index = Math.floor(input.value.valueOf());
    }
	this.in_String_$all = addElement("String");
	this.in_Number_$all = addElement("Number");
	this.in_Boolean_$all = addElement("Boolean");
	this.in_end = function()
    {
		if (this.index === null) return;
		let element = this.elements[this.index];
		if (element)
			return this?.["out_"+element.type]?.({value:element.value});
    }
}
get.Processor=getProcessor;
module.exports=get;