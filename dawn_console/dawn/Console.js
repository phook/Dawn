function Console(name)
{
    var Fob = require("./Fob.js");
	Fob.call(this,name);
	this._type="Console";
	this._lookup = function()
	{
		return new Console();
	}
	this._in_string = function(s)
	{
		// NATIVE BEGIN
		var do_eval = "print(\"" + s._value + "\")"
		Fob.server.clients.eval(do_eval);
		// NATIVE END
	}
}
module.exports = Console;