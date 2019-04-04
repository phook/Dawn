DawnString = function (name)
{
    var Fob = require("./Fob.js");
	Fob.call(this,name);
	this._type="String";
	this._out_string = null;
	if (name)
    {
    	this._value=name.substring(7);
	}
    else
		this._value="";
	this._lookup = function(value)
	{
		return new DawnString(value);
	}
	this._in_go = function()
	{
		if (this._out_string)
		{
			this._out_string._call(this);
		}
	}
}
module.exports=DawnString;