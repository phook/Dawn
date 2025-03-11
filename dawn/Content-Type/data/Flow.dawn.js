const Resource  = Dawn.require("Content-Type/data/Resource");
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
	this._connect = function(resource_to_connect_to)
	{
		if (this._last)
            this._last._connect(resource_to_connect_to);
		return resource_to_connect_to;
	}
	this._connect_function = function(outputName,fn)
	{
		if (this._last)
			this._last._instanciate_processor()._connect_function(outputName,fn);
	}

	this._add = function()
	{
		let args = Array.prototype.slice.call(arguments);
		let last = null;
		let self = this;
        args.forEach(function(child) {
	        if (typeof(child)=="string")
			{
				// find all _out types and search. - maybe scopes gets added to lookup as array
	            child = data._instanciate_processor()._lookup(child);
	        }
			if (typeof(child)=="function")
			{
				if (last)
					last._connect_function(child._outputName,child);
				child = child._boundThis; //NEW
			}
			else
			if (last)
			{
				child = child._instanciate_processor();
				last._connect(child);
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

	this._in_go = function()
	{
  		if (this._program)
		{
			this._execute_fn(this._program);
        }
	}
	

	return this;
}
_Flow.Processor = FlowProcessor;
module.exports = _Flow;