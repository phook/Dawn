const Resource  = Dawn.require("Content-Type/data/Resource");

// THIS IS THE DATA HOLDER - MAPPING TO NATIVE TYPE - IN THIS CASE A JAVASCRIPT STRING
function _String()
{
    Resource.call(this,"String"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
    this.Processor = StringProcessor;
}

// THIS IS THE PROCESSOR ASSOCIATED WITH STRING - EVERY FLOW ACCESSING STRING MUST INSTANCIATE ON OF THESE TO OPERATE ON THE VALUE
// SINCE STRING IS AN OBJECT, MULTIPLE PROCESSORS FOR THE DATA CAN BE CREATED, EACH POINTING TO THE ORIGINAL PIECE OF DATA
function StringProcessor(resource)
{
  Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
    this.in_String_$all = function(input)
    {   
      resource.value = input.value;
    }
    this.in_go = function()
    {
        return this.out_String?.(resource);
    }
    this.in_instanciate = function(input)
    {   
		 let newObject=this.get_resource().clone(); // Clone
		 if (input)
	         newObject.value = decodeURIComponent(input.value);
		 else
			 newObject.value = "";
     return newObject.instanciate_processor();
    }
	return this;
}
_String.Processor=StringProcessor;
module.exports=_String;
