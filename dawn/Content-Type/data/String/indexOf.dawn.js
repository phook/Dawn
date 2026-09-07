const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

// Finds the position of a search String inside a subject String.
// [String:hello String:llo]>>String.indexOf: emits 2; -1 when not found.
function indexOf()
{
  this.Number = new Number();
	Resource.call(this,"indexOf");
	this.Processor=indexOfProcessor;
	return this;
}

function indexOfProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_begin = function()
	{
		this.subject = null;
		this.search = null;
		this.emitted = false;
		return this.fire_end_parameters(); // pre-positioned parameter inputs
    }
	this.tryEmit = function()
	{
		if (!this.emitted && this.subject !== null && this.search !== null)
		{
			this.emitted = true;
			return this?.out_Number?.({value:resource.Number.bigRat(this.subject.indexOf(this.search))});
		}
    }
	this.in_String_subject = function(input) { this.subject = input.value; return this.tryEmit(); }
	this.in_String_search = function(input) { this.search = input.value; return this.tryEmit(); }
	this.in_end = function() { return this.tryEmit(); }
}
indexOf.Processor=indexOfProcessor;
module.exports=indexOf;