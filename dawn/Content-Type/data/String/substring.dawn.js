const Resource  = Dawn.require("Content-Type/data/Resource");

// Extracts part of each String flowing through, from start (inclusive) to
// end (exclusive). Without end, to the end of the string.
// String:abcdef>>String.substring:?|start=1&|end=4 emits "bcd"
function substring()
{
	Resource.call(this,"substring");
	this.Processor=substringProcessor;
	return this;
}

function substringProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.in_begin = function()
	{
		this.subjects = [];
		this.start = null;
		this.end = null;
		return this.fire_end_parameters(); // pre-positioned parameter inputs
    }
	this.in_String_$all = function(input)
    {
		this.subjects.push(input.value);
    }
	this.in_Number_start = function(input)
    {
		this.start = Math.floor(input.value.valueOf());
    }
	this.in_Number_end = function(input)
    {
		this.end = Math.floor(input.value.valueOf());
    }
	this.in_end = function()
    {
		for (let i in this.subjects)
			this?.out_String?.({value: this.end === null ? this.subjects[i].substring(this.start ?? 0)
			                                             : this.subjects[i].substring(this.start ?? 0, this.end)});
    }
}
substring.Processor=substringProcessor;
module.exports=substring;