const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");

function add()
{
  this.Number = new Number();
	Resource.call(this,"add"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=addProcessor;
	return this;
}

function addProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_Number = null;
	this.tempNumber = new resource.Number.bigRat(0,10);
	this.in_begin = function()
	{
		this.tempNumber=resource.Number.bigRat(0, 10)
    }
	this.in_Number_$all = function(input)
    {   
      this.tempNumber = this.tempNumber.add(input.value);
    }
	this.in_end = function()
    {
        return this?.out_Number({value:this.tempNumber}); 
    }
}
add.Processor=addProcessor;
module.exports=add;
