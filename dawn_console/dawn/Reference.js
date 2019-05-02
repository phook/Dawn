Reference = function (resource, parent)
{
	Fob.call(this,"");
	this._name = "Reference to " + resource;
    var previous = null;
	this._set_owner(parent);
    this.resource = resource;
    this._set_previous= function(_previous)
    {
        previous = _previous;
    }
    this._get_previous = function(_previous)
    {
        return previous;
    }
    // copy outputs
    for(a in resource)
    {
        // Create pass through functions to _in_ functions
        if (a.indexOf("_in_") == 0)
        {
		    let output=a;
            this[a] = function(...args)
            {
                resource[output](this,...args);
            }
        }
        else
        if (a.indexOf("_out_") == 0)
        {
            this[a] = null;
        }
    }
	this._offer_bind = function(match)
	{
		return resource._offer_bind(match,this);
	}
	this._bind = function(bindee)
	{
		var id = this._type;
		if (typeof(this._value) != "undefined")
			id+=this._value;
		debugInfo(id + " binds("+bindee._type+")");
		bindee._set_previous(this);
		this.bindee = bindee;		

        if (resource._sub_bind)
			resource._sub_bind(this,bindee);

        // bind outputs
		for(a in this)
		{
			if (a.indexOf("_out_") == 0)
			{
				match = a.substr(5);
				if (match.indexOf("_") != -1)
					match = match.substr(0,match.indexOf("_"));
				//debugInfo("trying to bind "+match);

                var input_bound = bindee._offer_bind(match,this)
                
				if (input_bound)
					this[a] = input_bound;
				/*
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
				*/
			}
		}
		return bindee;
	}
    this._go_from_start = function(pipe)
	{
		if (previous)
		{
			var first = previous;
			
			var loopTest = [first];
			
 			while (first._get_previous())
	 		{
 				first = first._get_previous();
			    loopTest.forEach(function(element){
				  if (first == element)
					  throw "circular ref error";
				});
				loopTest.push(first);
			}
			first._in_go(this);
		}
		else
		{
            
		}
	}

}
module.exports=Reference;
