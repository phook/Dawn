const Resource  = Dawn.require("Content-Type/data/Resource");

// Picks one element out of a flowing list by position (0-based).
// The first Number in the flow is the index; every other element is a
// candidate. A list can mix any types, so the picked element's type is known
// only at execution time — get declares no typed outputs. Like http:, it
// late-connects: the picked element is wrapped in its own typed resource,
// connected to the downstream connectee, and fired.
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
	this.in_octetstream_$all = addElement("octetstream");
	this.in_end = function()
    {
		if (this.index === null) return;
		let element = this.elements[this.index];
		if (!element || !this.connectee) return;
		// late connect (like http:) — the type is known only now
		let cast = Dawn.castValue(element.type, element.value);
		if (cast)
		{
			cast.connect(this.connectee);
			cast.in_go?.();
		}
    }
}
get.Processor=getProcessor;
module.exports=get;