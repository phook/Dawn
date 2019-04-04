function Pipe(name)
{
    var Fob = require("./Fob.js");
    
	// THE POINT OF PIPE IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF PIPE
	Fob.call(this,name);
	this._type="Pipe";
	this._element=null;
	this._bind = function(bindee)
	{
		if (this._element)
			this._element._bind(bindee);
		return bindee;
	}
	this._add = function(element)
	{
		this._element=element;
		return this;
	}
	this._lookup = function()
	{
		return new Pipe();
	}
	this._in_go = function()
	{
		if (this._element)
			this._element._go_from_start();
	}
}
module.exports = Pipe;