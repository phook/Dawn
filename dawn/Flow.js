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
	this._add = function(last)
	{
		var args = Array.prototype.slice.call(arguments);
		var last = null;
		var childIx=0;
        args.forEach(function(child) {
	        if (typeof(child)=="string")
	            child = data._lookup(child,true);
			if (last)
				last._bind(child);
			else
			{
				data._first = child;
				data._first["_in_begin@"] = true; // occupy _begin - previous function should not bind to these inputs
		        data._first["_in_go@"]    = true; // occupy _go
		        data._first["_in_end@"]   = true; // occupy _end
			}
			last= child;
			data._children[childIx++]=child;			
		});

		return this;

		/*
        if (typeof(last)=="string")
            last = this._lookup(last,true);
        else
        if (last._isHolder)
        {
            let bindee = last._bindee;
            last = this._lookup(last._lookup,true);
            last._bind(bindee);
        }

		data._last = last;
		data._first = last._first();
        data._first["_in_begin@"] = true; // occupy _begin - previous function should not bind to these inputs
        data._first["_in_go@"]    = true; // occupy _go
        data._first["_in_end@"]   = true; // occupy _end
		return this;
		*/
	}
	
    // SCOPE DECORATOR - override lookup so stack lookup os used - bind need to pass scope to push to stack
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


	return this;
}
_Flow.Processor = FlowProcessor;
module.exports = _Flow;