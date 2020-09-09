function DawnList()
{
    var Dawn = require("../Dawn.js");
	Dawn.Fob.call(this,"List");
	this._elements=[];
	this._pass_bind = function(pipe, bindee)
	{
		this._bindee = bindee;
		for(element in this._elements)
		{
	        this._elements[element]._set_previous(pipe);
			this._elements[element]._bind(bindee);
		}
		bindee._set_previous(pipe);  // VERY IMPORTANT - OVERRIDE SO REWIND DOESENT GO "INTO" LIST
		return bindee;
	}
	this._offer_bind = function(match)
	{
		for(b in this)
		{
			if ((b == "_in_" + match) || (b.indexOf("_in_"+match+"_") == 0))
			{
				if ((b.indexOf("_$")==(b.length-2)) || typeof(this[b+"@"]) == "undefined")
				{
					this[b+"@"] = true;
					return new _call(pipe,this,this[b]);
					break;
				}
			}
		}

		for(element in this._elements)
		{
			var input_bound = this._elements[element]._offer_bind(match);
            
            // binding single output to multiple inputs?
            if (input_bound)
                return input_bound;
		}
	}
	this._add = function()
	{
		var inputs="";
        var args = Array.prototype.slice.call(arguments);
        Dawn.debugInfo("list adding "+args.length+ " elements");
        var self = this;
        args.forEach(function(element) {
			element._set_owner(self);
            element["_in_go@"] = true; // occupy _go
            self._elements.push(element);
        });
		return this;
	}
	this._in_lookup = function()
	{
		return new DawnList();
	}
	this._in_begin = function(pipe)
	{
		for(element in this._elements)
		{
			if (this._elements[element])
				this._elements[element]._in_begin(pipe);
		}
		if (this._bindee)
			this._bindee._in_begin(pipe);
	}
	this._in_end = function(pipe)
	{
		for(element in this._elements)
		{
			if (this._elements[element])
				this._elements[element]._in_begin(pipe);
		}
		if (this._bindee)
			this._bindee._in_end(pipe);
	}
	this._in_go = function(pipe)
	{
        Dawn.debugInfo("list going");
		for(element in this._elements)
		{
			if (this._elements[element])
				this._elements[element]._in_go(pipe);
		}
		if (this._bindee)
			this._bindee._in_go(pipe);
	}
}
module.exports=DawnList;