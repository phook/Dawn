function Pipe()
{
    var Fob = require("./Fob.js");    
	// THE POINT OF PIPE IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF PIPE
	Fob.call(this,"Pipe");
	this._first=null;
	this._last=null;
    this._bound = false;
	this._out_pipe=null;
	this._in_lookup = function(pipe,from_owner)
	{
			return new Pipe();
	}
	this._pass_bind = function(pipe, bindee)
	{
		if (this._last)
            this._last._bind(bindee);
		return bindee;
	}
	this._add = function(last)
	{
		this._last = last;
		this._first = last._first();
        this._first["_in_go@"] = true; // occupy _go
		return this;
	}
    /*
	this._in_lookup = function()
	{
		return new Pipe();
	}
    */
	this._in_go = function(pipe)
	{
		if (this._first /*&& this._bound*/)
			this._first._in_go(pipe);
	}
}
module.exports = Pipe;