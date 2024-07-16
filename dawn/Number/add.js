const Resource = Dawn.require('./dawn/Resource.js');

function add()
{
	Resource.call(this,"add"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=addProcessor;
	return this;
}

function addProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = new Dawn.bigRat(0,10);; // NOT CORRECT - MUST BE STRING
	this._in_begin = function()
	{
		this._tempNumber=Dawn.bigRat(0, 10)
    }
	this._in_Number_$ = function(input)
    {   
      this._tempNumber = this._tempNumber.add(input._value);
    }
	this._in_end = function()
    {
	  if (this._out_Number)
        this._out_Number({_value:this._tempNumber}); // WRONG - MUST BE STRING
    }
}
add.Processor=addProcessor;
module.exports=add;
