const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function mul()
{
  this.Number = new Number();
	Resource.call(this,"mul"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=mulProcessor;
	return this;
}

function mulProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.tempNumber = new resource.Number.bigRat(1,1);
	this.in_begin = function()
	{
		this.tempNumber=resource.Number.bigRat(1,1);
    }
	this.in_Number_$all = function(input)
    {   
      this.tempNumber = this.tempNumber.multiply(input.value);
    }
	this.in_end = function()
    {
        this.out_Number?.({value:this.tempNumber}); // WRONG - MUST BE STRING
    }
}
mul.Processor=mulProcessor;
module.exports=mul;
