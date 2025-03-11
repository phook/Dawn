//  define Console
const Resource  = Dawn.require("Content-Type/data/Resource");

function Console()
{
	Resource.call(this,"Console"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=ConsoleProcessor;
	return this;
}

function ConsoleProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._in_String_$ = function(input)
    {   
        Dawn.print(input._value)
    }
	this._in_Number_$ = function(input)
    {   
        Dawn.print(input._value.toDecimal())
    }
	this._in_Boolean_$ = function(input)
    {   
        Dawn.print(input._value?"true":"false")
    }
	return this;
}
Console.Processor=ConsoleProcessor;
module.exports=Console;
