const Resource = Dawn.require("./dawn/Resource.js");
_Input = function ()
{
	Resource.call(this,"NewInput");
	this.out_native=null;
	this.in_instanciate = function(identifier)
	{
       return Object.assign({_input_name:identifier.data.value},new _Input());
	}
    this.in_native$ = function(data)
    {
	    var clean_name = this.input_name.replace("$","");
//        var function_source = "function "+clean_name+"("+clean_name+"){" + data.data.value + "}";
        var function_source = data.data.value;
        //Dawn.debugInfo("Adding " + function_source + " to " + this.out_native.name + ".in_" + this.input_name);

        // consider moving to _input_go (or _input_end) for clarity
        if (this.out_native)
//            this.out_native({value:"this.in_"+clean_name+"=eval(\""+function_source+"\")"});
            this.out_native({data:{value:"this.in_"+clean_name+"=function("+clean_name+"){"+function_source+"}"}});
    }
}
module.exports=_Input;