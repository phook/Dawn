_Input = function (name)
{
    var self = this;
    var Fob = require("../Fob.js");
	Fob.call(self,name);
	self._type="Input";
	if (name)
    {
    	self._input_name=name.substring(6);
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
    self._in_pipe = function(pipe)
    {
        self._bindee["_in_"+self._input_name] = pipe._function;
    }
}
module.exports=_Input;