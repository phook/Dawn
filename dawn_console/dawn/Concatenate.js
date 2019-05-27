function Concatenate(name)
{
    var self = this;
    var Fob = require("./Fob.js");
	Fob.call(self,name);
	self._type="Concatenate";
    self._value = "";
	self._out_string = null;
	self._in_go = function(pipe)
	{
		if (pipe._out_string)
		{
			pipe._out_string._call(self);
		}
    }
	self._in_string_$ = function(pipe, s)
	{
        console.log("concattenating "+s._value);
		self._value += s._value;
	}
}
module.exports = Concatenate;