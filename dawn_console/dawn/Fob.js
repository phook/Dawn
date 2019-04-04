function Fob(name)
{
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
	function _call(obj,fn)
    {
        this._call = function()
        {
            fn.apply(obj,arguments);
        }
    }
	
	this._name = name;
	this._type="Fob";
	this._it = 0;
	this._children = {};
	this._previous = null;
	this._setprevious = function(previous)
	{
		this._previous = previous;
	}
    this._add=function()
	{
        var args = Array.prototype.slice.call(arguments);
		var owner = this;
        args.forEach(function(child) {
			child._setprevious(owner);
			var name = "";
			if (child._name)
				name = child._name;
			else
				name = "Ix" + owner._it++;
			owner._children[name] = child;
        });
		return this;
	}
	this._lookup = function(identifier)
	{
        // first remove own reference if needed
    	debugInfo("lookup(" + identifier +")");
		
        var keys = Object.keys(this._children);
        keys.sort(dawnSort);        
        
        for(id in keys)
        {
     		debugInfo("looking at " + keys[id]);
			if (identifier.indexOf(keys[id]) == 0)
			{
        		debugInfo("offering "+identifier+" to " + keys[id]);
				offerResult = this._children[keys[id]]._lookup(identifier);
				if (offerResult)
					return offerResult;
			}
		}
		throw "id not found: "+identifier;
	    return new Fob(identifier);
	}
	this._bind = function(bindee)
	{
		var id = this._type;
		if (typeof(this._value) != "undefined")
			id+=this._value;
		debugInfo(id + " binds("+bindee._type+")");
		bindee._setprevious(this);
		this.bindee = bindee;
		

        // bind outputs
		for(a in this)
		{
			if (a.indexOf("_out_") == 0)
			{
				match = a.substr(5);
				if (match.indexOf("_") != -1)
					match = match.substr(0,match.indexOf("_"));
				//debugInfo("trying to bind "+match);
				for(b in bindee)
				{
					//debugInfo("checking "+b+" = _in_" + match);
					if ((b == "_in_" + match) || (b.indexOf("_in_"+match+"_") == 0))
					{
						if ((b.indexOf("_$")==(b.length-2)) || typeof(bindee[b+"@"]) == "undefined")
						{
                     		debugInfo("  " + a + " connects to"+b);
							bindee[b+"@"] = true;
							this[a] = new _call(bindee,bindee[b]);
							break;
						}
					}
				}
			}
		}

		// bind children
		for(child in this._children)
		{
	        this._children[child]._setprevious(this);
			this._children[child]._bind(bindee);
		}
		
		return bindee;
	}
	this._in_go = function()
	{
    	debugInfo("fob go called");
		for(element in this._elements)
		{
			debugInfo("running element in list");
			this._elements[element]._go();
		}
		if (this.bindee)
			this.bindee._go();
	}
	this._go_from_start = function()
	{
		debugInfo("fob " + this._type+ " go_from_start called");
		if (this._previous)
		{
            var a=1;
			debugInfo(a);
			var first = this._previous;
			
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
    this._get_qualified_name = function()
    {
        if (this._previous)
            return this._previous._get_qualified_name() + "." + this._name;
        return this._name;
    }
	return this;
}
module.exports = Fob;