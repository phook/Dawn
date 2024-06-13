const Resource = Dawn.require("./dawn/Resource.js");
_Input = function ()
{
	Resource.call(this,"NewInput");
	this._out_native=null;
	this._in_instanciate = function(identifier)
	{
       return Object.assign({_input_name:identifier.data._value},new _Input());
	}
    this._in_native$ = function(data)
    {
	    var clean_name = this._input_name.replace("$","");
//        var function_source = "function "+clean_name+"("+clean_name+"){" + data.data._value + "}";
        var function_source = data.data._value;
        //Dawn.debugInfo("Adding " + function_source + " to " + this._out_native._name + "._in_" + this._input_name);

        // consider moving to _input_go (or _input_end) for clarity
        if (this._out_native)
//            this._out_native({_value:"this._in_"+clean_name+"=eval(\""+function_source+"\")"});
            this._out_native({data:{_value:"this._in_"+clean_name+"=function("+clean_name+"){"+function_source+"}"}});
    }
}
module.exports=_Input;