/*
define concatenate
  output String
  input begin
    native javascript
      this.data = {};
      this.data._value = "";
    endnative
  input go
    native javascript
      if (this._out_String)
        this._out_String(this)
    endnative
  input all String
    native javascript
      this.data._value += input.data._value;
    endnative
*/
//  define concatenate
const Resource = Dawn.require('./dawn/Resource.js');

function concatenate()
{
	Resource.call(this,"concatenate"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=concatenateProcessor;
	return this;
}

function concatenateProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_String = null;
	this._tempString = ""; // NOT CORRECT - MUST BE STRING
	this._in_String = function(input)
    {   
      this._tempString += input._value;
    }
	this._in_end = function()
    {
	  if (this._out_String)
        this._out_String({_value:this._tempString}); // WRONG - MUST BE STRING
    }
}
concatenate.Processor=concatenateProcessor;
module.exports=concatenate;
