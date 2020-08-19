Reference = function (resource, parent)
{
    var Fob = require("./Fob.js");
	Fob.call(this,"");
	this._name = "Reference to " + resource._type;
    this.previous = null;
	this._set_owner(parent);
    this.resource = resource;
	this.inputs_bound = {};
    if (typeof(resource) !== "string" && resource._is_reference())
        Fob.debugInfo("ERROR - reference to reference");
    this._set_previous= function(_previous)
    {
        this.previous = _previous;
    }
    this._get_previous = function(_previous)
    {
        return this.previous;
    }
    this._is_reference = function(){return true;}

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
        if (!bindee._is_reference())
              Fob.debugInfo("ERROR not binding to reference");
        
		var id = this._type;
		if (typeof(this._value) != "undefined")
			id+=this._value;

		bindee._set_previous(this);
		this.bindee = bindee;		

        Fob.debugInfo("trying to bind " + this.resource._name + " to " +  bindee.resource._name);

        if (resource._pass_bind)
        {
			let input_bound = resource._pass_bind(this,bindee);
            //return input_bound;
        }

		for(a in this)
		{
			if (a.indexOf("_out_") == 0)
			{
				match = a.substr(5);
				if (match.indexOf("_") != -1)
					match = match.substr(0,match.indexOf("_"));
                
                let input_bound = bindee._offer_bind(match,this)
                
				if (input_bound)
                {
                    Fob.debugInfo("binding " + this.resource._name + " to " +  bindee.resource._name);
					this[a] = input_bound;
                }
			}
		}
		return bindee;
	}
    this._in_begin = function()
    {
        this.resource._in_begin(this);
    }
    this._in_end = function()
    {
        this.resource._in_end(this);
    }
    this._in_go = function()
    {
        this.resource._in_go(this);
    }
    this._first = function(pipe)
	{
        
		if (this.previous)
		{
			var first = this.previous;
			
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
			return first;
		}
		else
		{
          return this;   
		}
	}

}
module.exports=Reference;
