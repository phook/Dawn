_Input = function (name)
{
    var self = this;
    var Fob = require("../Fob.js");
	Fob.call(self,name);
	self._out_native=null;
	self._type="Input";
	if (name)
    {
    	self._input_name=name.substring(6);
        self._input_name_clean=self._input_name.replace("_$","");
	}
    else
		self._input_name="";
	self._in_lookup = function(pipe)
	{
		return new _Input(pipe.resource);
	}
    self._in_native_$ = function(pipe,data)
    {
        //pipe.bindee.resource["_in_"+self._input_name] = data._function;
        var function_source = "[function(pipe," + self._input_name_clean + "){" + data._source + "}][0]";
        console.log("Adding " + function_source + " to " + pipe._out_native.reference._name + "._in_" + self._input_name);
        if (pipe._out_native)
            pipe._out_native.reference["_in_"+self._input_name] = eval(function_source);
    }
}
module.exports=_Input;