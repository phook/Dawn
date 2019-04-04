function Concatenate(name)
{
    var Fob = require("./Fob.js");
	Fob.call(this,name);
	this._type="Concatenate";
	this._out_string = null;
	this._value = "";
	this._in_string_$ = function(s)
	{
		this._value += s._value;
	}
	this._lookup = function()
	{
		return new Concatenate();
	}
	this._in_go = function()
	{
        // inherit from string? or have a string inside?
        console.log("concatenating " +this._value);
		if (this._out_string)
			this._out_string._call(this);
    	this._value = "";
	}
}
module.exports = Concatenate;