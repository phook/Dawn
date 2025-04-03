const Resource  = Dawn.require("Content-Type/data/Resource");

function not()
{
	Resource.call(this,"not");
	this.Processor=notProcessor;
	return this;
}

function notProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Boolean = null;
	this.in_Boolean_$all = function(input)
    {   
        this?.out_Boolean({value:!input.value}); 
    }
}
not.Processor=notProcessor;
module.exports=not;
