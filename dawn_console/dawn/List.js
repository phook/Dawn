function DawnList(name)
{
    var self = this;
    var Fob = require("./Fob.js");
	Fob.call(self,name);
	self._elements=[];
	self._bindee = null;
	self._type="List";
	self._sub_bind = function(pipe, bindee)
	{
        console.log("list binding");
		for(element in self._elements)
		{
	        self._elements[element]._set_previous(pipe);
			self._elements[element]._bind(bindee);
		}
	    bindee._set_previous(pipe);
		self._bindee = bindee;
		return bindee;
	}
	self._offer_bind = function(match)
	{
		for(element in self._elements)
		{
			var input_bound = self._elements[element]._offer_bind(match);
		    if (input_bound)
				return input_bound;
		}
	}
	self._add = function()
	{
        console.log("list adding");
		var inputs="";
        var args = Array.prototype.slice.call(arguments);
		var list = self;
        args.forEach(function(element) {
			element._set_owner(list);
            list._elements.push(element);
        });
		return list;
	}
	self._lookup = function()
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