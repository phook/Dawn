const Resource = Dawn.require('./dawn/Resource.js');

// THIS IS THE DATA HOLDER - MAPPING TO NATIVE TYPE - IN THIS CASE A JAVASCRIPT STRING
function _String()
{
    Resource.call(this,"String"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
    //Value.call(this,"String");
	this._value = new String("");
	// instanciate value when creating resources
    this._in_instanciate = function(input)
    {   
		 let newObject=Object.assign({}, this); // Clone
		 if (input)
	         newObject._value = decodeURIComponent(input._value);
         return newObject._instanciate_processor();
    }
	this.Processor=StringProcessor;
	return this;
}

// THIS IS THE PROCESSOR ASSOCIATED WITH STRING - EVERY FLOW ACCESSING STRING MUST INSTANCIATE ON OF THESE TO OPERATE ON THE VALUE
// SINCE STRING IS AN OBJECT, MULTIPLE PROCESSORS FOR THE DATA CAN BE CREATED, EACH POINTING TO THE ORIGINAL PIECE OF DATA
function StringProcessor(resource)
{
    Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_String = null;
    this._in_String = function(input)
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
	return this;
}
String.Processor=StringProcessor;
module.exports=_String;
