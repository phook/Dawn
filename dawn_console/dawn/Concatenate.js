function Concatenate(name)
{
    var self = this;
    var Fob = require("./String.js");
	Fob.call(self,name);
	self._type="Concatenate";
    self._value = "";
	self._lookup = function()
	{
		return new Concatenate();
	}
    self._string_in_go = self._in_go;
	self._in_go = function(pipe)
	{
        self._string_in_go(pipe);
    	self._value = "";
	}
	self._in_string_$ = function(pipe, s)
	{
        console.log("concatting "+s._value);
		self._value += s._value;
	}
}
module.exports = Concatenate;