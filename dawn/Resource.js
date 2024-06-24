var id = 1;

function clone(src) {
	var clone=Object.assign({}, src);
	clone.inputs_bound={};
	clone.previous=null;
	return clone;
}
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

function Resource(name,owner)
{
	this._id = id++;
    this._path = [""];

	this._name = name;
	this._type="Resource";
	this._it = 0;
	this._children = {};
	this._owner = owner ? owner : null;

	this.Processor = ResourceProcessor;
	this._instanciate_processor = function()
	{
		return new this.Processor(this);
	}
	this.defaultProcessor = null;
	
    this._in_instanciate = function(input)
    {
		return this._instanciate_processor()._in_instanciate(input);
    }
	// instanciate value when creating resources
	/* MOVED TO PROCESSOR
    this._in_instanciate = function(input)
    {   
		 let newObject=Object.assign({}, this); // Clone
         return newObject._instanciate_processor();
    }
	*/
    // javascript wrapper version for dawn defined function
    this._lookup = function(identifier, setOwner)
    {
      if (identifier.indexOf(":") == -1)
          throw "error lookup of "+identifier+": colon missing";
      if (identifier == ".")
          return this;

	  var ref = {_value:identifier, _scope:this._scope}; // is _scope used?
      // later set up output in ref and return the result of the output
      // ref._out_fob = new call(this,this.result) - ish
      let result;
    /*  
      if (this._get_previous()) // inside flowscope
      {
          // if in a flow - look below and backwards in flow
         result= this._in_lookup_child(ref,true);
         if (!result)
             result = this._get_previous()._lookup(identifier);
         result._scope = this._first()._get_owner(); // store scope of the flow scope
      }
      else
	  */
      {
          // otherwhise look in owner - move that here
         result= this._in_lookup_child(ref);
 	     if (!result && this._scope)
			result = this._scope._lookup(identifier,true);
	     if (!result)
			 return null;
	     //   throw "error lookup of "+identifier+": lookup failed";
	     if (setOwner)
           result._scope = this._get_owner(); 
		 else
            result._scope = this; // store the scope in which it was looked up - for var defs
	  }
      if (!result)
          throw "error lookup of "+identifier+": lookup failed";
      
      if (setOwner)
          result._set_owner(this);
      return result;
    }
	
	this._in_lookup = function(string_name,from_owner,exclude) // if lookup should use _out_lookup instead of return - tail recursion should be used
	{
        if (string_name._value == this._name)
            return this; //// NO THIS SHOULD BE A REFERENCE HOLDING THE FLOW RELATED INFO - BUT VALUE RETAINED IN ORIGINAL Resource
        if (this._name == "")
            return this._in_lookup_child(string_name); // temp hack for root

        var originalResource = string_name._value;

        // remove own name from identifier - including delimeter/separator in this case "." (could be "/","\",":" etc.)
        var skip=false;
        let deref = "";
        if (this._name.charAt(-1) != "." && string_name._value.indexOf(this._name) == 0)
        {
            deref = string_name._value[this._name.length];
			if (deref == "?")
	            string_name._value = string_name._value.substring(this._name.length);
	        else
				string_name._value = string_name._value.substring(this._name.length+1);
            if (deref == ".")
            {
                let result = this._in_lookup_child(string_name,from_owner,exclude);
                if (result)
                    return result;
            }
            else if (deref == ":" || deref == "?")
            {
				let urlParametersToInputs = [];

				if (string_name._value.indexOf("?") !== -1)
                {
			        let parameters = string_name._value.substring(string_name._value.indexOf("?"));
			        string_name._value = string_name._value.substring(0,string_name._value.indexOf("?"));
				    //if (string_name._value.indexOf("|") !== -1) // if parameters AND input parameters
					{
						const URLparameters = /(?:\?|&|;)([^=]+)=([^&|;]*)/g;
	                    const matchAll = parameters.matchAll(URLparameters);
	                    let addAmpersand = false;
	                    for (const match of matchAll)
	                    {
	                        if (match[1].indexOf("|") === -1)
	                        {
	                            string_name._value += (addAmpersand ? "&" : "") + match[1] + "=" + match[2]; 
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
                let result = this._in_instanciate(string_name);
                if (result)
				{
					for(let i in urlParametersToInputs)
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
						if (inputname+"$e" in result)
                        {
							result[inputname+"$e"](value);
                            result.inputs_bound[inputname+"$e"]=true; // to prevent bind errors
                        }
					}
				}
                return result;
            }
 		}
                
		if (this._owner && !from_owner)
		{
            string_name._value = originalResource;
			return this._owner._in_lookup(string_name,from_owner,this);
		}
		
        return null;
	}
    this._lookup_child = function(identifier)
    {
      var ref = {_value:identifier};
      return this._in_lookup_child(ref);
    }
	this._in_lookup_child = function(string_name,from_owner,exclude)
	{
        var identifier = string_name._value;

        var keys = Object.keys(this._children);
        keys.sort(dawnSort);        

        for(testPath in this._path) // needs the first element to be ""
        {
            var identifierToCheck = this._path[testPath] + identifier;
  		    string_name._value = identifierToCheck;
            for(let id in keys)
            {
				if (this._children[keys[id]] != exclude)
				{
	                if (identifierToCheck.indexOf(keys[id]) == 0)
	                {
	                    var result = this._children[keys[id]]._in_lookup(string_name,true);
	                    if (result)
	                        return result;
	                }
				}
            }
        }
	    if (this._owner && !from_owner)
		   return this._owner._in_lookup_child(string_name,false,this);
        return null;
	}

	this._get_resource = function()
	{
		return this;
	}
	this._set_owner = function(owner)
	{
		this._owner = owner;
	}
	this._get_owner = function(owner)
	{
		return this._owner;
	}
    this._clone = function(){return clone(this);}

	return this;
}
function ResourceProcessor(resource)
{
	this._get_resource = function()
	{
		return resource;
	}	
    this._output_bind_error = null;
    // Sorts keys in "dawn" order - where matching starts of string results in the longer being on top

    /*
	function _call(obj,fn)
    {
        this._call = function()
        {
   	 	    var args = Array.prototype.slice.call(arguments);
            return fn.apply(obj,args);
        }
    }
    */
	this._lookup = function(name) {
        var identifier = name;

		if (identifier.indexOf("input:") == 0)
		{
			let name = identifier.replace("input:","");
			if (this["__in_" + name + "_value"])
				return this["__in_" + name + "_value"];
		}
		else
		if (identifier.indexOf("output:") == 0)
		{
			let name = identifier.replace("output:","");
			if (this["_out_" + name])
				return this["_out_" + name]; 
		}
		return resource._lookup(name);
	}
	
    this._clone = function(){return clone(this);}
	
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
		resource._owner = owner;
	}
	this._get_owner = function(owner)
	{
		return resource._owner?resource._owner:this;
	}
    this._add=function()
	{
        var args = Array.prototype.slice.call(arguments);
        var self = this;
        args.forEach(function(child) {
	        child = child._get_resource(); // nonoptimal - but coerce child to be the resource - if its a processor
            if (child=="string")
                child = resource._lookup(child);
            else
            if (child._isHolder)
            {
                let bindee = child._bindee;
                child = resource._lookup(child._lookup);
                child._instanciate_processor()._bind(bindee); // nonoptimal
            }
            
            child._set_owner(self._get_resource()); //nonoptimal
			var name = "";
			if (child._name)
				name = child._name;
			else
				name = "Ix" + resource._it++;
			resource._children[name] = child;
        });
		return this;
	}

    this._in_string_name$e=function(string_name)
    {
        resource._name = string_name._value;
    }

    this._in_instanciate = function(input)
    {   
		 let newObject=Object.assign({}, this); // Clone
         return newObject._instanciate_processor();
    }
	/* OLD WHERE IT IS IN THE RESOURCE
    this._in_instanciate = function(input)
    {   
		 
         return resource._in_instanciate(input);
    }
	*/
/*
    // javascript wrapper version for dawn defined function
    this._lookup = function(identifier, setOwner)
    {
      if (identifier.indexOf(":") == -1)
          throw "error lookup of "+identifier+": colon missing";
      if (identifier == ".")
          return this;
	  if (identifier.indexOf("input") == 0)
		  return new Resource("Input"); // should be created TODO NOTFIXED
			
	  var ref = {_value:identifier, _scope:this._scope}; // is _scope used?
      // later set up output in ref and return the result of the output
      // ref._out_fob = new call(this,this.result) - ish
      let result;
      
      if (this._get_previous()) // inside flowscope
      {
          // if in a flow - look below and backwards in flow
         result= this._in_lookup_child(ref,true);
         if (!result)
             result = this._get_previous()._lookup(identifier);
         result._scope = this._first()._get_owner(); // store scope of the flow scope
      }
      else
      {
          // otherwhise look in owner - move that here
         result= this._in_lookup_child(ref);
 	     if (!result && this._scope)
			result = this._scope._lookup(identifier,true);
	     if (!result)
	        throw "error lookup of "+identifier+": lookup failed";
	     if (setOwner)
           result._scope = this._get_owner(); 
		 else
            result._scope = this; // store the scope in which it was looked up - for var defs
	  }
      if (!result)
          throw "error lookup of "+identifier+": lookup failed";
      
      if (setOwner)
          result._set_owner(this);
      return result;
    }
	
	this._in_lookup = function(string_name,from_owner,exclude) // if lookup should use _out_lookup instead of return - tail recursion should be used
	{
        if (string_name._value == resource._name)
            return this; //// NO THIS SHOULD BE A REFERENCE HOLDING THE FLOW RELATED INFO - BUT VALUE RETAINED IN ORIGINAL Resource
        if (resource._name == "")
            return this._in_lookup_child(string_name); // temp hack for root

        var originalResource = string_name._value;

        // remove own name from identifier - including delimeter/separator in this case "." (could be "/","\",":" etc.)
        var skip=false;
        let deref = "";
        if (resource._name.charAt(-1) != "." && string_name._value.indexOf(resource._name) == 0)
        {
            deref = string_name._value[resource._name.length];
			if (deref == "?")
	            string_name._value = string_name._value.substring(resource._name.length);
	        else
				string_name._value = string_name._value.substring(resource._name.length+1);
            if (deref == ".")
            {
                let result = this._in_lookup_child(string_name,from_owner,exclude);
                if (result)
                    return result;
            }
            else if (deref == ":" || deref == "?")
            {
				let urlParametersToInputs = [];

				if (string_name._value.indexOf("?") !== -1)
                {
			        let parameters = string_name._value.substring(string_name._value.indexOf("?"));
			        string_name._value = string_name._value.substring(0,string_name._value.indexOf("?"));
				    //if (string_name._value.indexOf("|") !== -1) // if parameters AND input parameters
					{
						const URLparameters = /(?:\?|&|;)([^=]+)=([^&|;]*)/g;
	                    const matchAll = parameters.matchAll(URLparameters);
	                    let addAmpersand = false;
	                    for (const match of matchAll)
	                    {
	                        if (match[1].indexOf("|") === -1)
	                        {
	                            string_name._value += (addAmpersand ? "&" : "") + match[1] + "=" + match[2]; 
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
                let result = this._in_instanciate(string_name);
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
						if (inputname+"$e" in result)
                        {
							result[inputname+"$e"](value);
                            result.inputs_bound[inputname+"$e"]=true; // to prevent bind errors
                        }
					}
				}
                return result;
            }
 		}
                
		if (resource._owner && !from_owner)
		{
            string_name._value = originalResource;
			return resource._owner._in_lookup(string_name,from_owner,resource);
		}
		
        return null;
	}
    this._lookup_child = function(identifier)
    {
      var ref = {_value:identifier};
      return this._in_lookup_child(ref);
    }
	this._in_lookup_child = function(string_name,from_owner,exclude)
	{
        var identifier = string_name._value;
           
        var keys = Object.keys(resource._children);
        keys.sort(dawnSort);        

        for(testPath in resource._path) // needs the first element to be ""
        {
            var identifierToCheck = resource._path[testPath] + identifier;
  		    string_name._value = identifierToCheck;
            for(id in keys)
            {
				if (resource._children[keys[id]] != exclude)
				{
	                if (identifierToCheck.indexOf(keys[id]) == 0)
	                {
	                    var result = resource._children[keys[id]]._in_lookup(string_name,true);
	                    if (result)
	                        return result;
	                }
				}
            }
        }
	    if (resource._owner && !from_owner)
		   return resource._owner._in_lookup_child(string_name,false,resource);
        return null;
	}
    */
	this._offer_bind = function(match, origin)
	{
        match = "_in_" + match;
		for(let b in this)
		{
			if (b.indexOf("_$in_") == 0 && this[b]) // if not precompiled
			{
				let a=b.replace("$","");
				//this[a]= Dawn.return_executable_function.call(this,this[b]());
				var result = this[b]();
				if (Array.isArray(result))
					result = Dawn.return_executable_function.call(this,result);
				this[a]=  result; // $ function should return executable function
				this[b] = undefined; // not entirely correct - function should be saved to react to runtime lookup scope changes - but not a concern now
			}
		}
		for(b in this)
		{
            if (b.indexOf("_in_") == 0)
            {
                let explicit = b.endsWith("$e");
                let all_outputs = b.endsWith("$");
                if ((b == match) ||                                   // perfect match
                    (b == match + "$") ||                             // catchall
                    (!explicit && b.indexOf(match+"_") == 0) ||       // type match 
                    (explicit && b == match+"$e"))                    // explicit match
                {
                       // inputs ending with $ takes all outputs
                    if ((all_outputs) || typeof(this.inputs_bound[b]) == "undefined")
                    {
                        this.inputs_bound[b] = true;
                        
						let newBoundFunction=this[b].bind(this);
                        newBoundFunction._boundThis=this;
						newBoundFunction._outputName= match.replace("_in_","");;
						return newBoundFunction;
						break;
                    }
                }
            }
		}
	}
    this._bind = function(bindee)
    {
        if (typeof(bindee)=="string")
		{
			let result = resource._lookup(bindee,true);
			if (!result)
				result = this._get_resource()._lookup(bindee); //nonoptimal
            bindee = result;
		}
        
//        var id = this._type;
//        if (typeof(resource._value) != "undefined")
//            id+=resource._value;

        bindee._set_previous(this);
        this.bindee = bindee;		

        Dawn.debugInfo("trying to bind " + resource._name + " to " +  bindee._name);

		// pass bind skal flyttes til en List override ad bind
        if (this._pass_bind)
        {
            let input_bound = this._pass_bind(bindee);
            // bindee._scope._add_to_flowscope(this);
            return bindee;
        }

        for(let a in this)
        {
            if (a.indexOf("_out_") == 0)
            {
                match = a.substr(5);
                
                let input_bound = bindee._offer_bind(match,this)
                
                if (input_bound)
                {
                    Dawn.debugInfo("binding " + resource._name + " to " +  bindee._name);
                    this[a] = input_bound;
                }
            }
        }
        if (typeof(bindee._end_bind) != "undefined")
            bindee._end_bind();
        
        // bindee._scope._add_to_flowscope(this);
        return bindee;
    }    

    this._bind_function = function(outputName,fn)
    {

		// pass bind skal flyttes til en List override ad bind
        if (this._pass_bind_function)
        {
            let input_bound = this._pass_bind_function(fn._boundThis);
            return;
        }

		if (("_out_"+outputName) in this)
			this["_out_"+outputName] = fn;
    }    


    this._in_native$ = function(data)
    {
        Function(data._value).call(this);
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
            return this._previous._get_qualified_name() + "." + resource._name;
        return resource._name;
    }
    this._first = function()
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
		if (!fn)
			fn=context._in_go; // default input to call
        if (fn)
            this._nextFunction.splice(this._add_next_function_at,0,fn.bind(context)); // javscript bind to bind function to resource
		this._add_next_function_at++;
    }
	
	
    this._execute_next_function = function(scope)
    {
		this._add_next_function_at = 0;
        // flowScope = new FlowScope(scope);
        while (this._nextFunction.length)
        {
            // flowScope._reset() - sets array to length 1
            let fn = this._nextFunction.shift(); 
            let result = fn(scope); //flowScope
            if (result)
                return result;
        }
    }


	/*simple
    this._execute = function(scope,array_of_lines)
    {
		array_of_lines.forEach(function(line){this._add_next_function(line);});
		this._execute_next_function(scope);
    }
	*/
	// NEW CONCEPT FOR LINES - CONTAINS FLOWS - CALLS _in_go, promise is return if async, if promise is returned - it sets execution to continue at resolve
    this._execute = function(scope,array_of_lines)
    {
        while (array_of_lines.length)
        {
            let flowForThisLine = array_of_lines.shift(); 
            let result = flowForThisLine._in_go(scope);
            if (result)
			{
                return result.promise().then(function()
				{
					this.execute(scope,array_of_lines);
				});
			}
        }
    }

    this._execute_fn = function(scope,array_of_lines)
    {
        while (array_of_lines.length)
        {
            let flowForThisLine = array_of_lines.shift(); 
            let result = flowForThisLine(scope);
            if (result)
			{
                result.promise().then(function()
				{
					return this.execute(scope,array_of_lines);
				});
			}
        }
    }

	// little dirty - make sure that resources and processers are called correctly
	this._instanciate_processor = function()
	{
		return this;
	}
	return this;
}
Resource.Processor = ResourceProcessor;
module.exports = Resource;