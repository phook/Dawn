const Resource  = Dawn.require("Content-Type/data/Resource");

// Joins the elements of a flowing list into one String.
// Numbers join by decimal form, Booleans by true/false.
function join()
{
	Resource.call(this,"join");
	this.Processor=joinProcessor;
	return this;
}

function joinProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.in_begin = function()
	{
		this.tempString = "";
    }
	this.in_String_$all = function(input)
	{
		this.tempString += input.value;
    }
	this.in_Number_$all = function(input)
	{
		this.tempString += input.value.toDecimal();
    }
	this.in_Boolean_$all = function(input)
	{
		this.tempString += input.value ? "true" : "false";
    }
	this.in_end = function()
	{
		return this?.out_String?.({value:this.tempString});
    }
}
join.Processor=joinProcessor;
module.exports=join;