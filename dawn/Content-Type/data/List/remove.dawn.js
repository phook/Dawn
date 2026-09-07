const Resource  = Dawn.require("Content-Type/data/Resource");

// Removes one element from a flowing list by position (0-based);
// every other element passes through with its own type, in order.
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
	this.out_String = null;
	this.out_Number = null;
	this.out_Boolean = null;
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
	this.in_end = function()
    {
		for (let i in this.elements)
			if (Number(i) !== this.index)
				this?.["out_" + this.elements[i].type]?.({value: this.elements[i].value});
    }
}
remove.Processor=removeProcessor;
module.exports=remove;