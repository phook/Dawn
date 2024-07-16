const Resource = Dawn.require('./dawn/Resource.js');

function sub()
{
	Resource.call(this,"sub"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=subProcessor;
	return this;
}

function subProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = new Dawn.bigRat(0,10);; // NOT CORRECT - MUST BE STRING
	this._in_Number_minuend = function(input)
    {   
      this._tempNumber = input._value;
    }
	this._in_Number_$ = function(input)
    {   
      this._tempNumber = this._tempNumber.subtract(input._value);
    }
	this._in_end = function()
    {
	  if (this._out_Number)
        this._out_Number({_value:this._tempNumber}); // WRONG - MUST BE STRING
    }
}
sub.Processor=subProcessor;
module.exports=sub;
