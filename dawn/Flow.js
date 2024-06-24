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
	data._first=null;
	data._last=null;
    data._bound = false;
	this._pass_bind = function(bindee)
	{
		if (data._last)
            data._last._bind(bindee);
		return bindee;
	}
	this._pass_bind_function = function(outputName,fn)
	{
		if (data._last)
			data._last_instanciate_processor()._bind_function(outputName,fn);
	}

	this._add = function()
	{
		let args = Array.prototype.slice.call(arguments);
		let last = null;
		let childIx=0;
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
				data._first = child;
				data._first["_in_begin@"] = true; // occupy _begin - previous function should not bind to these inputs
				if (data._first._in_begin)
					data._first._in_begin = data._first._in_begin.bind(child);
				data._first["_in_go@"]    = true; // occupy _go
				if (data._first._in_go)
					data._first._in_go = data._first._in_go.bind(child);
		        data._first["_in_end@"]   = true; // occupy _end
				if (data._first._in_end)
					data._first._in_end = data._first._in_end.bind(child);
			}
			last= child;
			data._children[childIx++]=child;			
		});

		return this;

	}

	this._in_go = function(scope)
	{
  		if (data._first)
		{
			this._execute_fn(scope,
			[
				data._first._in_begin,
				data._first._in_go,
				data._first._in_end
			]); 
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