const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function power()
{
  this.Number = new Number();
	Resource.call(this,"power"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=powerProcessor;
	return this;
}

function powerProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.tempNumber = new resource.Number.bigRat(0,10);
	this.in_Number_base = function(input)
    { // raise error if not called?  
      this.tempNumber = input.value;
    }
	this.in_Number_$all = function(input)
    {  
		if (this.tempNumber)
			this.tempNumber = this.tempNumber.pow(input.value);
		else
			this.tempNumber = input.value;
    }
	this.in_end = function()
    {
        this.out_Number?.({value:this.tempNumber}); 
    }
}
power.Processor=powerProcessor;
module.exports=power;
