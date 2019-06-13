_Input = function ()
{
    var Fob = require("../Fob.js");
	Fob.call(this,"Input");
	this._out_native=null;
	this._in_lookup_child = function(pipe)
	{
       return Object.assign({_input_name:pipe.resource},new _Input());
	}
    this._in_native_$ = function(pipe,data)
    {
	    var clean_name = this._input_name.replace("_$","");
        var function_source = "[function(pipe," + clean_name + "){" + data._source + "}][0]";
        console.log("Adding " + function_source + " to " + pipe._out_native.reference._name + "._in_" + this._input_name);

        // consider moving to _input_go (or _input_end) for clarity
        if (pipe._out_native)
            pipe._out_native.reference["_in_"+this._input_name] = eval(function_source);
    }
}
module.exports=_Input;