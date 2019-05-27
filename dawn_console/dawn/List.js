function DawnList(name)
{
    var self = this;
    var Fob = require("./Fob.js");
	Fob.call(self,name);
	self._elements=[];
	self._type="List";
	self._pass_bind = function(pipe, bindee)
	{
		self._bindee = bindee;
		for(element in self._elements)
		{
	        self._elements[element]._set_previous(pipe);
			self._elements[element]._bind(bindee);
		}
		bindee._set_previous(pipe);  // VERY IMPORTANT - OVERRIDE SO REWIND DOESENT GO "INTO" LIST
		return bindee;
	}
	self._offer_bind = function(match)
	{
		for(b in self)
		{
			if ((b == "_in_" + match) || (b.indexOf("_in_"+match+"_") == 0))
			{
				if ((b.indexOf("_$")==(b.length-2)) || typeof(self[b+"@"]) == "undefined")
				{
					self[b+"@"] = true;
					return new _call(pipe,self,self[b]);
					break;
				}
			}
		}

		for(element in self._elements)
		{
			var input_bound = self._elements[element]._offer_bind(match);
            
            // binding single output to multiple inputs?
            if (input_bound)
                return input_bound;
		}
	}
	self._add = function()
	{
		var inputs="";
        var args = Array.prototype.slice.call(arguments);
        console.log("list adding "+args.length+ " elements");
        args.forEach(function(element) {
			element._set_owner(self);
            element["_in_go@"] = true; // occupy _go
            self._elements.push(element);
        });
		return self;
	}
	self._in_lookup = function()
	{
		return new DawnList();
	}
	self._in_go = function(pipe)
	{
        console.log("list going");
		for(element in self._elements)
		{
			if (self._elements[element])
				self._elements[element]._in_go(pipe);
		}
		if (self._bindee)
			self._bindee._in_go(pipe);
	}
}
module.exports=DawnList;