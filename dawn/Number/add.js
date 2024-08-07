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
	this._tempNumber = new Dawn.bigRat(0,10);
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
        return this?._out_Number({_value:this._tempNumber}); 
    }
}
add.Processor=addProcessor;
module.exports=add;
