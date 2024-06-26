const Resource  = Dawn.require("./dawn/Resource.js");
function _Flow()
{
	// THE POINT OF FLOW IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF FLOW
	Resource.call(this,"Flow");
	this.Processor = FlowProcessor;
	return this;
}
function FlowProcessor(data)
{
	// THE POINT OF FLOW IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF FLOW
	Resource.Processor.call(this,data);
	data._children=[];
	this._first=null;
	this._last=null;
//	this._pass_bind = function(bindee)
	this._bind = function(bindee)
	{
		if (this._last)
            this._last._bind(bindee);
		return bindee;
	}
//	this._pass_bind_function = function(outputName,fn)
	this._bind_function = function(outputName,fn)
	{
		if (this._last)
			this._last_instanciate_processor()._bind_function(outputName,fn);
	}

	this._add = function()
	{
		let args = Array.prototype.slice.call(arguments);
		let last = null;
		let self = this;
        args.forEach(function(child) {
	        if (typeof(child)=="string")
	            child = data._lookup(child,true);
	        if (typeof(child)=="function")
			{
				if (last)
					last._bind_function(child._outputName,child);
				child = child._boundThis; //NEW
			}
			else
			if (last)
			{
				child = child._instanciate_processor();
				last._bind(child);
			}
			else
			{
				/// THESE BOUND ONES SHOULD RESIDE IN THE PROCESSOR NOT THE RESOURCE
				child = child._instanciate_processor();
				self._first = child;
				self._first["_in_begin@"] = true; // occupy _begin - previous function should not bind to these inputs
				if (self._first._in_begin)
					self._first._in_begin = self._first._in_begin.bind(child);
				self._first["_in_go@"]    = true; // occupy _go
				if (self._first._in_go)
					self._first._in_go = self._first._in_go.bind(child);
		        self._first["_in_end@"]   = true; // occupy _end
				if (self._first._in_end)
					self._first._in_end = self._first._in_end.bind(child);
			}
			last= child;
			data._children.push(child);			
		});

		this._program = [
				this._first._in_begin,
				this._first._in_go,
				this._first._in_end
		];

		return this;

	}

	this._in_go = function(scope)
	{
  		if (this._program)
		{
			this._execute_fn(scope,this._program);
        }
	}
	
/*
	this._in_go = function(scope)
	{
        // HERE DECOREATE SCOPE - NO SCOPE IS OPERATIONAL WHEN BINDING
        
        
        //_go returns the promises if applicable... this means the end call will have to go into other function to be called later - just let the caller await
		if (data._first)
		{
            scope._add_next_function(data._first,data._first._in_begin);
            scope._add_next_function(data._first,data._first._in_go) 
            scope._add_next_function(data._first,data._first._in_end) 
            return scope._execute_next_function(scope);
        }
	}
*/
	return this;
}
_Flow.Processor = FlowProcessor;
module.exports = _Flow;