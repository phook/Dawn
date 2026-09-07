const Resource = Dawn.require("Content-Type/data/Resource");

// A Reference points at a resource without instantiating it:
// Reference:Number.negate is a handle meaning "that resource over there".
// Used to pass resources as values — e.g. List.map:?|using=Number.negate
function Reference()
{
    Resource.call(this,"Reference");
    this.Processor = ReferenceProcessor;
}

function ReferenceProcessor(resource)
{
  Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Reference = null;
    this.in_go = function()
    {
        return this.out_Reference?.(resource);
    }
    this.in_instanciate = function(input)
    {   
		 let newObject=this.get_resource().clone(); // Clone
		 if (input)
	         newObject.reference = input.value; // the URI of the referenced resource
         return newObject.instanciate_processor();
    }
	return this;
}
Reference.Processor=ReferenceProcessor;
module.exports=Reference;