function Fob(name)
{
    var self = this;
    Fob.reference = function(reference)
	{
	    // self should hold previous, output bindings etc.. pass to object, scopet!!! det er den piperne er bygget op af...
		self.reference = reference;
	}
	
	var debug = true;
	function debugInfo(s)
	{
		  if (debug)
			  console.log(s);
	}

    // Sorts keys in "dawn" order - where matching starts of string results in the longer being on top
    function dawnSort(a,b)
    { 
        if (b.indexOf(a) == 0)
        {
            return 1;
        }
        if (a.indexOf(b) == 0)
        {
            return -1;
        }
        return a>b?1:-1;
    }
	function _call(pipe, obj,fn)
    {
		this.reference = obj;
        this._call = function()
        {
   	 	    var args = Array.prototype.slice.call(arguments);
			args.unshift(pipe);
            fn.apply(obj,args);
        }
    }
	function clone(src) {
	  return Object.assign({}, src);
	}
	
	self._name = name;
	self._type="Fob";
	self._it = 0;
	self._children = {};
	self._owner = null;
	self._out_go = null;
	self._set_owner = function(owner)
	{
		self._owner = owner;
	}
	/*
	self._previous = null;
	self._setprevious = function(previous)
	{
		self._previous = previous;
	}
	*/
    self._add=function()
	{
        var args = Array.prototype.slice.call(arguments);
		var owner = self;
        args.forEach(function(child) {
			child._set_owner(owner);
			var name = "";
			if (child._name)
				name = child._name;
			else
				name = "Ix" + owner._it++;
			owner._children[name] = child;
        });
		return self;
	}
	self._lookup = function(identifier)
	{
        if (identifier == self._name) return self;

	    if (identifier.indexOf(self._name + ".") == 0)
		  identifier = identifier.substring(self._name.length+1);
   
   
        // first remove own reference if needed
    	debugInfo(self._name + ".lookup(" + identifier +")");
		
        var keys = Object.keys(self._children);
        keys.sort(dawnSort);        
        
        for(id in keys)
        {
     		debugInfo("looking at " + keys[id]);
			if (identifier.indexOf(keys[id]) == 0)
			{
        		debugInfo("offering "+identifier+" to " + keys[id]);
				offerResult = self._children[keys[id]]._lookup(identifier);
				if (offerResult)
					return offerResult;
			}
		}
		
		if (self._owner)
		{
		    debugInfo("lookup failed - offering parent " + self._owner.name);
			return self._owner._lookup(identifier);
		}
		
		return Object.assign({}, this); // CLONE MYSELF
	}

	self._offer_bind = function(match,pipe)
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
	}
	self._in_go = function()
	{
    	debugInfo("fob go called");
		for(child in self._children)
		{
			debugInfo("running child in list");
			self._children[child]._in_go();
		}
		if (self.bindee)
			self.bindee._in_go();
	}
/*
	self._go_from_start = function()
	{
		debugInfo("fob " + self._type+ " go_from_start called");
		if (self._previous)
		{
            var a=1;
			debugInfo(a);
			var first = self._previous;
			
			var loopTest = [first];
			
			while (first._previous)
			{
				first = first._previous;
				debugInfo(++a + " - " + first._type);	
			    loopTest.forEach(function(element){
				  if (first == element)
					  throw "circular ref error";
				});
				loopTest.push(first);
			}
			debugInfo(JSON.stringify(first,function( key, value) {if (key == "_previous") return ""; return value;}));
			first._in_go();
		}
		else
		{
		}
	}
*/
    self._get_qualified_name = function()
    {
        if (self._previous)
            return self._previous._get_qualified_name() + "." + self._name;
        return self._name;
    }
	return self;
}
module.exports = Fob;