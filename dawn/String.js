const Resource = Dawn.require('./dawn/Resource.js');

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
	this._resource = resource;
	this._out_String = null;
    this._in_String_$ = function(input)
    {   
      resource._value = input._value;
    }
    this._in_go = function()
    {
      if (this._out_String)
        this._out_String(resource);
      if (this._out_Resource)
        this._out_Resource(resource);
    }
    this._in_instanciate = function(input)
    {   
		 let newObject=this._get_resource()._clone(); // Clone
		 if (input)
	         newObject._value = decodeURIComponent(input._value);
		 else
			 newObject._value = "";
         return newObject._instanciate_processor();
    }
	return this;
}
_String.Processor=StringProcessor;
module.exports=_String;
