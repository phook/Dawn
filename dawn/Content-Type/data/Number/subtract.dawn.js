const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function sub()
{
  this.Number = new Number();
	Resource.call(this,"sub"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=subProcessor;
	return this;
}

function subProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.tempNumber = new resource.Number.bigRat(0,10);
	this.in_begin = function()
  {
    this.tempNumber = new resource.Number.bigRat(0,10);
  }
	this.in_Number_minuend = function(input)
    { // raise error if not called?  
      this.tempNumber =  this.tempNumber.add(input.value);
    }
	this.in_Number_$all = function(input)
    { // raise error if not called at least once?  
      this.tempNumber = this.tempNumber.subtract(input.value);
    }
	this.in_end = function()
    {
        this.fire_end_parameters();
        // needs to be executed async
        result = this.out_Number?.({value:this.tempNumber}); 
        return this.out_end?.();
    }
}
sub.Processor=subProcessor;
module.exports=sub;
