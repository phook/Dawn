const Resource  = Dawn.require("Content-Type/data/Resource");
const castLib   = Dawn.require("Scheme/cast");

// Removes one element from a flowing list by position (0-based);
// every other element passes through with its own type, in order.
// A list can mix any types, so each passing element's type is known only at
// execution time — remove declares no typed outputs; like http:, it
// late-connects each passing element in its own typed resource.
// The index is a Number in the flow or a parameter: ?|index=1
// [String:a String:b String:c]>>List.remove:?|index=1 emits a, c
function remove()
{
	Resource.call(this,"remove");
	this.Processor=removeProcessor;
	return this;
}

function removeProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.in_begin = function()
	{
		this.index = null;
		this.elements = [];
		return this.fire_end_parameters(); // pre-positioned parameter inputs
    }
    function collect(type)
    {
		return function(input) { this.elements.push({type:type, value:input.value}); };
    }
	this.in_Number_index = function(input)
    {
		this.index = Math.floor(input.value.valueOf());
    }
	this.in_String_$all = collect("String");
	this.in_Number_$all = collect("Number");
	this.in_Boolean_$all = collect("Boolean");
	this.in_octetstream_$all = collect("octetstream");
	this.in_end = function()
    {
		for (let i in this.elements)
		{
			if (Number(i) === this.index || !this.connectee) continue;
			// late connect (like http:) — the type is known only now
			let cast = castLib.castValue(this.elements[i].type, this.elements[i].value);
			if (cast)
			{
				cast.connect(this.connectee);
				cast.in_go?.();
			}
		}
    }
}
remove.Processor=removeProcessor;
module.exports=remove;