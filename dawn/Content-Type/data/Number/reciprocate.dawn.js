const Resource  = Dawn.require("Content-Type/data/Resource");

function reciprocate()
{
	Resource.call(this,"reciprocate"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=reciprocateProcessor;
	return this;
}

function reciprocateProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_Number_$all = function(input)
    {
		this.out_Number?.({value:input.value.reciprocate()}); 		
	}
}
reciprocate.Processor=reciprocateProcessor;
module.exports=reciprocate;
