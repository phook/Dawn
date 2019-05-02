_Input = function (name)
{
    var self = this;
    var Fob = require("../Fob.js");
	Fob.call(self,name);
	self._type="Input";
	if (name)
    {
    	self._input_name=name.substring(6);
        self._input_name_clean=self._input_name.replace("_$","");
	}
    else
		self._input_name="";
	self._lookup = function(value)
	{
		return new _Input(value);
	}
	self._bind = function(bindee)
	{
        bindee._setprevious(self);
        self._bindee = bindee;
        return bindee;
	}
    self._in_pipe = function(pipe,data)
    {
        //pipe.bindee.resource["_in_"+self._input_name] = data._function;
        var function_source = "[function(pipe," + self._input_name_clean + "){" + data._source + "}][0]";
        console.log(function_source);
        pipe.bindee.resource["_in_"+self._input_name] = eval(function_source);
    }
}
module.exports=_Input;