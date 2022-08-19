var id = 1;
function Resource(name)
{
	this.id = id++;
    this.path = [""];
	
    this._output_bind_error = null;
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
   	 	    var args = Array.prototype.slice.call(arguments);
			//args.unshift(pipe);
            return fn.apply(obj,args);
        }
    }
	function clone(src) {
	    var clone=Object.assign({}, src);
        clone.inputs_bound={};
        clone.previous=null;
        return clone;
    }
	
    this._clone = function(){return clone(this);}
	this._name = name;
	this._type="Resource";
	this._it = 0;
	this._children = {};
	this._owner = null;
	
	this._out_begin = null;
	this._out_end = null;
	
    this.inputs_bound = {};
    
    this.previous = null;
    this.next = null; 
    this._test_previous= function(_new_previous)
    {
        if (this == _new_previous)
        {
           throw("circular reference");          
        }
        if (this.previous)
        {
            if (_new_previous == this.previous)
            {
                throw("circular reference");
            }
            return this.previous._test_previous(_new_previous);
        }
        return true;
    }
    this._set_previous= function(_previous)
    {
        _previous._test_previous(this);
        this.previous = _previous;
    }
    this._get_previous = function(_previous)
    {
        return this.previous;
    }
    this._set_next= function(_next)
    {
        this.next = _next;
    }
    this._get_next = function(_next)
    {
        return this.next;
    }

	this._set_owner = function(owner)
	{
		this._owner = owner;
	}
	this._get_owner = function(owner)
	{
		return this._owner?this._owner:this;
	}
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
      if (identifier.indexOf(":") == -1)
          throw "error lookup of "+identifier+": colon missing";
      if (identifier == ".")
          return this;
      var ref = {_value:identifier, _scope:this};
      // later set up output in ref and return the result of the output
      // ref._out_fob = new call(this,this.result) - ish
      let result = this._in_lookup_child(ref);
	  if (!result)
          throw "error lookup of "+identifier+": lookup failed";
       return result;
    }
    this._in_string_name_e$=function(pipe)
    {
        this._name = pipe._value;
    }
    this._in_instanciate = function(pipe)
    {
        return this._clone();
    }
	this._in_lookup = function(pipe,from_owner)
	{
        if (pipe._value == this._name)
            return this; //// NO THIS SHOULD BE A REFERENCE HOLDING THE PIPE RELATED INFO - BUT VALUE RETAINED IN ORIGINAL Resource
        if (this._name == "")
            return this._in_lookup_child(pipe); // temp hack for root

        var originalResource = pipe._value;

        // remove own name from identifier - including delimeter/separator in this case "." (could be "/","\",":" etc.)
        var skip=false;
        let deref = "";
        if (this._name.charAt(-1) != "." && pipe._value.indexOf(this._name) == 0)
        {
            deref = pipe._value[this._name.length];
			if (deref == "?")
	            pipe._value = pipe._value.substring(this._name.length);
	        else
				pipe._value = pipe._value.substring(this._name.length+1);
            if (deref == ".")
            {
                let result = this._in_lookup_child(pipe,from_owner);
                if (result)
                    return result;
            }
            else if (deref == ":" || deref == "?")
            {
				let urlParametersToInputs = [];

				if (pipe._value.indexOf("?") !== -1)
                {
			        let parameters = pipe._value.substring(pipe._value.indexOf("?"));
			        pipe._value = pipe._value.substring(0,pipe._value.indexOf("?"));
				    //if (pipe._value.indexOf("|") !== -1) // if parameters AND input parameters
					{
						const URLparameters = /(?:\?|&|;)([^=]+)=([^&|;]*)/g;
	                    const matchAll = parameters.matchAll(URLparameters);
	                    let addAmpersand = false;
	                    for (const match of matchAll)
	                    {
	                        if (match[1].indexOf("|") === -1)
	                        {
	                            pipe._value += (addAmpersand ? "&" : "") + match[1] + "=" + match[2]; 
	                            addAmpersand = true;
	                        }
	                        else
	                        {
	                            if (match[1].indexOf("|") === 0)
	                            {
									urlParametersToInputs.push({input:match[1].substring(1),value:match[2]});
	                            }
	                            else
                                {
	                                Dawn.error("illegal URI \"|\" only allowed as first charachter in input parameters");
                                }
	                        }
	                    }
					}
                }
                let result = this._in_instanciate(pipe);
                if (result)
				{
					for(i in urlParametersToInputs)
		            {
						let type = "number";
						let input = urlParametersToInputs[i].input;
						let value = urlParametersToInputs[i].value;
						if (value.indexOf("\"") == 0)
						{
							value.replace("\"","");
							type="string";
                            value =  this._lookup("String:" + value);
						}
                        else
                        {
                            value = this._lookup("Number:" + value);
                        }
						let inputname = "_in_" + type + "_" + input;
						if (inputname in result)
                        {
							result[inputname](value);
                            result.inputs_bound[inputname]=true; // to prevent bind errors
                        }
						else
						if (inputname+"_e$" in result)
                        {
							result[inputname+"_e$"](value);
                            result.inputs_bound[inputname+"_e$"]=true; // to prevent bind errors
                        }
					}
				}
                return result;
            }
 		}
                
		if (this._owner && !from_owner)
		{
            pipe._value = originalResource;
			return this._owner._in_lookup(pipe);
		}
		
        return null;
	}
    this._lookup_child = function(identifier)
    {
      var ref = {_value:identifier};
      return this._in_lookup_child(ref);
    }
	this._in_lookup_child = function(pipe,from_owner)
	{
        var identifier = pipe._value;
           
        var keys = Object.keys(this._children);
        keys.sort(dawnSort);        

        for(testPath in this.path) // needs the first element to be ""
        {
            var identifierToCheck = this.path[testPath] + identifier;
  		    pipe._value = identifierToCheck;
            for(id in keys)
            {
                if (identifierToCheck.indexOf(keys[id]) == 0)
                {
                    var result = this._children[keys[id]]._in_lookup(pipe,true);
                    if (result)
                        return result;
                }
            }
        }
	    if (this._owner && !from_owner)
		   return this._owner._in_lookup_child(pipe);
        return null;
	}
    
	this._offer_bind = function(match)
	{
        match = "_in_" + match;
		for(b in this)
		{
            if (b.indexOf("_in_") == 0)
            {
                let explicit = b.endsWith("_e$");
                let all_outputs = b.endsWith("_$");
                if ((b == match) ||                                   // perfect match
                    (!explicit && b.indexOf(match+"_") == 0) ||       // type match 
                    (explicit && b == match+"_e$"))                   // explicit match
                {
                       // inputs ending with _$ takes all outputs
                    if ((all_outputs) || typeof(this.inputs_bound[b]) == "undefined")
                    {
                        this.inputs_bound[b] = true;
                        return this[b].bind(this);
                        break;
                    }
                }
            }
		}
	}
    this._bind = function(bindee)
    {
        var id = this._type;
        if (typeof(this._value) != "undefined")
            id+=this._value;

        bindee._set_previous(this);
        this.bindee = bindee;		

        Dawn.debugInfo("trying to bind " + this._name + " to " +  bindee._name);

        if (this._pass_bind)
        {
            let input_bound = this._pass_bind(bindee);
            return bindee;
        }

        for(a in this)
        {
            if (a.indexOf("_out_") == 0)
            {
                match = a.substr(5);
                
                let input_bound = bindee._offer_bind(match)
                
                if (input_bound)
                {
                    Dawn.debugInfo("binding " + this._name + " to " +  bindee._name);
                    this[a] = input_bound;
                }
            }
        }
        if (typeof(bindee._end_bind) != "undefined")
            bindee._end_bind();
        return bindee;
    }    



    this._in_native_$ = function(data)
    {
        Function(data._value).call(this);
        //    eval.call(this, data._value);
        //Dawn.passedEval.call(this, data._value);
    }
	this._in_begin = function(scope)
	{
		if (this._out_begin)
			this._out_begin(scope);
	}
	this._in_end = function(scope)
	{
		if (this._out_end)
			this._out_end(scope);
        this.inputs_bound={};
        this.bindee=null;
        this.previous=null;
	}
	this._in_go = function(scope)
	{
	}
    this._get_qualified_name = function()
    {
        if (this._previous)
            return this._previous._get_qualified_name() + "." + this._name;
        return this._name;
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
                  {
                      throw "circular ref error";
                  }
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
    this._in_native_$ = function(data)
    {
        Function(data._value).call(this);
    }

    this._bind_error = function(errorMessage)
    {
        if (this._output_bind_error)
            this._output_bind_error(errorMessage);
        else
            this.call(this._get_owner(),errorMessage);
    }

	this._add_next_function_at = 0;
    this._nextFunction = [];
    this._add_next_function=function(context,fn)
    {
        if (fn)
            this._nextFunction.splice(this._add_next_function_at,0,fn.bind(context));
//            this._nextFunction.push(fn.bind(context));
		this._add_next_function_at++;
    }
    this._execute_next_function = function(scope)
    {
		this._add_next_function_at = 0;
        while (this._nextFunction.length)
        {
            let result = this._nextFunction.shift()(scope);
            if (result)
                return result;
        }
    }
	return this;
}


module.exports = Resource;