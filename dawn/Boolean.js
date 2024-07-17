const Resource = Dawn.require('./dawn/Resource.js');

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
	this._resource = resource;
	this._out_Boolean = null;
    this._in_Boolean = function(input)
    {   
      resource._value = input._value;
    }
    this._in_go = function()
    {
      if (this._out_Boolean)
        this._out_Boolean(resource);
      if (this._out_Resource)
        this._out_Resource(resource);
    }
    this._in_instanciate = function(input)
    {   
		 let newObject=this._get_resource()._clone(); // Clone
		 if (input)
	         newObject._value = input._value.toLowerCase()=="true";
		 else
			 newObject._value = false;
         return newObject._instanciate_processor();
    }
	return this;
}
Boolean.Processor=BooleanProcessor;
module.exports=Boolean;
