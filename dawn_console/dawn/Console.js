function Console(name)
{
    var self = this;
    var Fob = require("./Fob.js");
	Fob.call(self,name);
	self._type="Console";
	self._lookup = function(name)
	{
        if (self._name == name)
            return self;
		return new Console();
	}
	self._in_string_$ = function(pipe,s)
	{
		// NATIVE BEGIN
		var do_eval = "print(\"" + s._value + "\")"
		Fob.server.clients.eval(do_eval);
		// NATIVE END
	}
}
module.exports = Console;

/*
function Console(name)
{
    var Fob = require("./Fob.js");
	Fob.call(self,name);
	self._type="Console";
	self._lookup = function()
	{
		return new Console();
	}
	self._in_string = function(s)
	{
		// NATIVE BEGIN
		var do_eval = "print(\"" + s._value + "\")"
		Fob.server.clients.eval(do_eval);
		// NATIVE END
	}
}
module.exports = Console;
*/