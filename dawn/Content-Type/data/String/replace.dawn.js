const Resource  = Dawn.require("Content-Type/data/Resource");

// Replaces all occurrences of a search String with a replacement String.
// Inputs may flow in order [subject, search, replacement] or be
// pre-positioned with parameters: String:hello>>String.replace:?|search=l&|replacement=L
function replace()
{
	Resource.call(this,"replace");
	this.Processor=replaceProcessor;
	return this;
}

function replaceProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.in_begin = function()
	{
		this.subject = null;
		this.search = null;
		this.replacement = null;
		this.emitted = false;
		return this.fire_end_parameters(); // pre-positioned parameter inputs
    }
	this.tryEmit = function()
	{
		if (!this.emitted && this.subject !== null && this.search !== null && this.replacement !== null)
		{
			this.emitted = true;
			return this?.out_String?.({value:this.subject.split(this.search).join(this.replacement)});
		}
    }
	this.in_String_subject = function(input) { this.subject = input.value; return this.tryEmit(); }
	this.in_String_search = function(input) { this.search = input.value; return this.tryEmit(); }
	this.in_String_replacement = function(input) { this.replacement = input.value; return this.tryEmit(); }
	this.in_end = function() { return this.tryEmit(); }
}
replace.Processor=replaceProcessor;
module.exports=replace;