function Pipe(name)
{
    var self = this;
    var Fob = require("./Fob.js");
    
   if (!name)
      name = "Pipe";
	// THE POINT OF PIPE IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF PIPE
	Fob.call(self,name);
	self._type="Pipe";
	self._first=null;
	self._last=null;
    self._bound = false;
	self._out_pipe=null;
	self._in_lookup = function(pipe,from_owner)
	{
			return new Pipe();
	}
	self._pass_bind = function(pipe, bindee)
	{
		if (self._last)
            self._last._bind(bindee);
		return bindee;
	}
	self._add = function(last)
	{
		self._last = last;
		self._first = last._first();
        self._first["_in_go@"] = true; // occupy _go
		return self;
	}
    /*
	self._in_lookup = function()
	{
		return new Pipe();
	}
    */
	self._in_go = function(pipe)
	{
		if (self._first /*&& self._bound*/)
			self._first._in_go(pipe);
	}
}
module.exports = Pipe;