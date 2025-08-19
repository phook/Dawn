const Resource  = Dawn.require("Content-Type/data/Resource");

function negate()
{
	Resource.call(this,"negate"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=negateProcessor;
	return this;
}

function negateProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.in_Number_$all = function(input)
    {
		this.out_Number?.({value:input.value.negate()}); 		
	}
}
negate.Processor=negateProcessor;
module.exports=negate;
