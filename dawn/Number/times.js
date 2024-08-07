const Resource = Dawn.require('./dawn/Resource.js');

function times()
{
	Resource.call(this,"times"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=timesProcessor;
	return this;
}

function timesProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
	this._tempNumber = new Dawn.bigRat(0,10);; // NOT CORRECT - MUST BE STRING
	this._in_Number_$ = function(input)
    {   
    }
	this._in_end = function()
    {
    }
}
times.Processor=subProcessor;
module.exports=times;
