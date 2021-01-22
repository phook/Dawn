const Fob  = Dawn.require("./dawn/Fob.js");
function Pipe()
{
	// THE POINT OF PIPE IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF PIPE
	Fob.call(this,"Pipe");
	this._first=null;
	this._last=null;
    this._bound = false;
	this._out_pipe=null;
	this._in_lookup = function(identifier)
	{
			return new Pipe();
	}
	this._pass_bind = function(bindee)
	{
		if (this._last)
            this._last._bind(bindee);
		return bindee;
	}
	this._add = function(last)
	{
		this._last = last;
		this._first = last._first();
        this._first["_in_begin@"] = true; // occupy _begin
        this._first["_in_go@"]    = true; // occupy _go
        this._first["_in_end@"]   = true; // occupy _end
		return this;
	}
	this._in_go = function(scope)
	{
		if (this._first)
		{
			if (this._first._in_begin)
				this._first._in_begin();
			if (this._first._in_go)
				this._first._in_go(scope);
			if (this._first._in_end)
				this._first._in_end();
		}
	}
}
module.exports = function(scope){scope._add(new Pipe());};