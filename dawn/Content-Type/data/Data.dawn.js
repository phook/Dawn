const Resource = Dawn.require("Content-Type/data/Resource");

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
	this.out_Blob = null;
	this.in_Blob_$all = function(input)
    {
      let text = new TextDecoder().decode((input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value)));
      try { resource.value = JSON.parse(text); }
      catch(e) { resource.value = text; }
    }
	this.toBlob = function()
    {
      return new TextEncoder().encode(JSON.stringify(resource.value));
    }
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