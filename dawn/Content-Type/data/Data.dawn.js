const Resource = Dawn.require('./dawn/Resource.dawn.js');

// THIS IS THE DATA HOLDER - MAPPING TO NATIVE TYPE - IN THIS CASE A JAVASCRIPT DATASTREAM
function Data()
{
    Resource.call(this,"Data"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
    this.Processor = DataProcessor;
}

// THIS IS THE PROCESSOR ASSOCIATED WITH DATA - EVERY FLOW ACCESSING DATA MUST INSTANCIATE ON OF THESE TO OPERATE ON THE VALUE
// SINCE DATA IS AN OBJECT, MULTIPLE PROCESSORS FOR THE DATA CAN BE CREATED, EACH POINTING TO THE ORIGINAL PIECE OF DATA
function DataProcessor(resource)
{
  Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Data = null;
    this._in_Data = function(input)
    {   
      resource._value = input._value;
    }
    this._in_go = function()
    {
        return this?._out_Data(resource);
    }
    this._in_instanciate = function(input)
    {   
		 let newObject=this._get_resource()._clone(); // Clone
     return newObject._instanciate_processor();
    }
	return this;
}
Data.Processor=DataProcessor;
module.exports=Data;
