
var id = 1;
function Fob(name)
{
	this.id = id++;
    this.path = [""];
    Fob.reference = function(reference)
	{
	    // this should hold previous, output bindings etc.. pass to object, scopet!!! det er den piperne er bygget op af...
		this.reference = reference;
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
	
    this._clone = function(){return clone(this);}
	this._name = name;
	this._type="Fob";
	this._it = 0;
	this._children = {};
	this._owner = null;
	
	this._out_begin = null;
	this._out_end = null;
	
	this._set_owner = function(owner)
	{
		this._owner = owner;
	}
	this._get_owner = function(owner)
	{
		return this._owner?this._owner:this;
	}
	/*
	this._previous = null;
	this._setprevious = function(previous)
	{
		this._previous = previous;
	}
	*/
    this._is_reference = function(){return false;}
    this._add=function()
	{
        var args = Array.prototype.slice.call(arguments);
        var self = this;
        args.forEach(function(child) {
			child._set_owner(self);
			var name = "";
			if (child._name)
				name = child._name;
			else
				name = "Ix" + self._it++;
			self._children[name] = child;
        });
		return this;
	}
    // javascript wrapper version for dawn defined function
    this._lookup = function(identifier)
    {
      var ref = new Reference(identifier);
      // later set up output in ref and return the result of the output
      // ref._out_fob = new call(this,this.result) - ish
      return this._in_lookup(ref);
    }
	this._in_lookup = function(pipe,from_owner)
	{
        var identifier = pipe.resource;
        
        if (identifier == this._name) return this;

        // remove own name from identifier - including delimeter/separator in this case "." (could be "/","\",":" etc.)
	    if (identifier.indexOf(this._name + ".") == 0)
		  identifier = identifier.substring(this._name.length+1);
		else
	    if (identifier.indexOf(this._name + ":") == 0)
		  identifier = identifier.substring(this._name.length+1);

        let result = this._lookup_child(identifier);
		if (result)
            return result;
        
		if (this._owner && !from_owner)
		{
			return this._owner._in_lookup(pipe);
		}
		
		return Object.assign({}, this); // CLONE MYthis
	}
    this._lookup_child = function(identifier)
    {
      var ref = new Reference(identifier);
      return this._in_lookup_child(ref);
    }
	this._in_lookup_child = function(pipe,from_owner)
	{
        var identifier = pipe.resource;
           
        var keys = Object.keys(this._children);
        keys.sort(dawnSort);        

        for(testPath in this.path) // needs the first element to be ""
        {
            var identifierToCheck = this.path[testPath] + identifier;
  		    pipe.resource = identifierToCheck;
            for(id in keys)
            {
                if (identifierToCheck.indexOf(keys[id]) == 0)
                {
                    offerResult = this._children[keys[id]]._in_lookup(pipe,true);
                    if (offerResult)
                        return offerResult;
                }
            }
        }
        return null;
	}
    
	this._offer_bind = function(match,reference)
	{
		for(b in this)
		{
			if ((b.indexOf('@') == -1) && (b == "_in_" + match) || (b.indexOf("_in_"+match+"_") == 0))
			{
				if ((b.indexOf("_$")==(b.length-2)) || typeof(reference.inputs_bound[b]) == "undefined")
				{
					reference.inputs_bound[b] = true;
					return new _call(reference,this,this[b]);
					break;
				}
			}
		}
	}
    this._in_native_$ = function(pipe,data)
    {
    }
	this._in_begin = function()
	{
		if (this._out_begin)
			this._out_begin();
	}
	this._in_end = function()
	{
		if (this._out_end)
			this._out_end();
	}
	this._in_go = function()
	{
	}
    this._get_qualified_name = function()
    {
        if (this._previous)
            return this._previous._get_qualified_name() + "." + this._name;
        return this._name;
    }
	return this;
}
module.exports = Fob;