const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function div()
{
  this.Number = new Number();
	Resource.call(this,"div"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=divProcessor;
	return this;
}

function divProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.tempNumber = new resource.Number.bigRat(0,10);
	this.in_Number_dividend = function(input)
    { // raise error if not called?  
      this.tempNumber = input.value;
    }
	this.in_Number_$all = function(input)
    {   
      this.tempNumber = this.tempNumber.divide(input.value);
    }
	this.in_end = function()
    {
        this?.out_Number({value:this.tempNumber}); 
    }
}
div.Processor=divProcessor;
module.exports=div;
