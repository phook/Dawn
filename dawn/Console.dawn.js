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
	this.in_String_$all = function(input)
    {   
        Dawn.print(input.value)
    }
	this.in_Number_$all = function(input)
    {   
        Dawn.print(input.value.toDecimal())
    }
	this.in_Boolean_$all = function(input)
    {   
        Dawn.print(input.value?"true":"false")
    }
	this.in_error_$all = function(input)
    {   
        Dawn.print(input.value)
    }
	return this;
}
Console.Processor=ConsoleProcessor;
module.exports=Console;
