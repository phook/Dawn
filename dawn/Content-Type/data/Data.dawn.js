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
	this.resource = resource;
	this.out_Data = null;
    this.in_Data = function(input)
    {   
      resource.value = input.value;
    }
    this.in_go = function()
    {
        return this?.out_Data(resource);
    }
    this.in_instanciate = function(input)
    {   
		 let newObject=this.get_resource().clone(); // Clone
     return newObject.instanciate_processor();
    }
	return this;
}
Data.Processor=DataProcessor;
module.exports=Data;
