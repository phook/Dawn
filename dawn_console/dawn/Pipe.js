function Pipe(name)
{
    var self = this;
    var Fob = require("./Fob.js");
    
	// THE POINT OF PIPE IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF PIPE
	Fob.call(self,name);
	self._type="Pipe";
	self._element=null;
    self._bound = false;
	self._out_pipe=null;
    self._bind = function(bindee)
	{
        self._bound = true;
		if (self._element)
			self._element._bind(bindee);
		return bindee;
	}
	self._sub_bind = function(pipe, bindee)
	{
		self._element._bind(bindee);
		self._bindee = bindee;
		return bindee;
	}
	self._add = function(element)
	{
		self._element=element;
		return self;
	}
	self._lookup = function()
	{
		return new Pipe();
	}
	self._in_go = function(pipe)
	{
        if (pipe.out_pipe)
            pipe.out_pipe(self);
		if (self._element /*&& self._bound*/)
			self._element._go_from_start(pipe);
	}
}
module.exports = Pipe;