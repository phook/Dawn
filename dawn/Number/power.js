/*
define pow
  native javascript
    this._out_number = null;
    this._in_begin = function()
        this._value = new Dawn.bigRat();
    this._in_go = function()
      if (this._out_number)
        this._out_number(this);
    this._in_number_$ = function(number)
      this._value = this._value.pow(number._value);
  endnative
*/
const Resource = Dawn.require('./dawn/Resource.js');

function pow()
{
	Resource.call(this,"pow"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=powProcessor;
	return this;
}

function powProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = null; // NOT CORRECT - MUST BE STRING
	this._in_begin = function()
	{
		this._tempNumber=null;
    }
	this._in_Number_$ = function(input)
    {  
		if (this._tempNumber)
			this._tempNumber = this._tempNumber.pow(input._value);
		else
			this._tempNumber = input._value;
    }
	this._in_end = function()
    {
	  if (this._out_Number)
        this._out_Number({_value:this._tempNumber}); // WRONG - MUST BE STRING
    }
}
pow.Processor=powProcessor;
module.exports=pow;
