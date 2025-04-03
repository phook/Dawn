const Resource  = Dawn.require("Content-Type/data/Resource");

// THIS IS THE DATA HOLDER - MAPPING TO NATIVE TYPE - IN THIS CASE A JAVASCRIPT BOOLEAN
function Boolean()
{
    Resource.call(this,"Boolean"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
    this.Processor = BooleanProcessor;
}

// THIS IS THE PROCESSOR ASSOCIATED WITH BOOLEAN - EVERY FLOW ACCESSING BOOLEAN MUST INSTANCIATE ON OF THESE TO OPERATE ON THE VALUE
// SINCE BOOLEAN IS AN OBJECT, MULTIPLE PROCESSORS FOR THE DATA CAN BE CREATED, EACH POINTING TO THE ORIGINAL PIECE OF DATA
function BooleanProcessor(resource)
{
  Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Boolean = null;
    this.in_Boolean_$all = function(input)
    {   
      resource.value = input.value;
    }
    this.in_go = function()
    {
        let result = this.out_Boolean?.(resource);
    }
    this.in_instanciate = function(input)
    {   
		 let newObject=this.get_resource().clone(); // Clone
		 if (input)
	         newObject.value = input.value.toLowerCase()=="true";
		 else
			 newObject.value = false;
         return newObject.instanciate_processor();
    }
	return this;
}
Boolean.Processor=BooleanProcessor;
module.exports=Boolean;
