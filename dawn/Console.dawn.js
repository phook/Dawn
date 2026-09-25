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
  this.print = Dawn.print;
	Resource.Processor.call(this,resource); 
	this.in_String_$all = function(input)
    {   
        this.print(input.value)
    }
	this.in_Number_$all = function(input)
    {   
        this.print(input.value.toDecimal())
    }
	this.in_Boolean_$all = function(input)
    {   
        this.print(input.value?"true":"false")
    }
	this.in_octetstream_$all = function(input)
    {
        let n = input.value && input.value.length !== undefined ? input.value.length : 0;
        this.print("octetstream(" + n + " bytes)");
    }
	this.in_error_$all = function(input)
    {   
        this.print(input.value)
    }
	return this;
}
Console.Processor=ConsoleProcessor;
module.exports=Console;