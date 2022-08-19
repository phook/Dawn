const Resource  = Dawn.require("./dawn/Resource.js");
function Pipe()
{
	// THE POINT OF PIPE IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF PIPE
	Resource.call(this,"Pipe");
	this._first=null;
	this._last=null;
    this._bound = false;
	this._out_pipe=null;
	this._instanciate = function(identifier)
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
        this._first["_in_begin@"] = true; // occupy _begin - previous function should not bind to these inputs
        this._first["_in_go@"]    = true; // occupy _go
        this._first["_in_end@"]   = true; // occupy _end
		return this;
	}
	this._in_go = function(scope)
	{
        //_go returns the promises if applicable... this means the end call will have to go into other function to be called later - just let the caller await
		if (this._first)
		{
            scope._add_next_function(this._first,this._first._in_begin);
            scope._add_next_function(this._first,this._first._in_go) 
            scope._add_next_function(this._first,this._first._in_end) 
            return scope._execute_next_function(scope);
        }
	}
}
module.exports = Pipe;