const Resource = Dawn.require("./dawn/Resource.js");
function List()
{
	Resource.call(this,"List");
	// elements in resource holds resources
	this._elements=[];
	this.Processor = ListProcessor;
	return this;
}
function ListProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	// elements in list holds processors
	this._elements = resource._elements.map(a => ({...a})).map(a => a._instanciate_processor());
//	this._pass_bind = function(bindee)
	this._bind = function(bindee)
	{
		this._bindee = bindee;
		for(element in this._elements)
		{
	        //this._elements[element]._set_previous(this);
			this._elements[element]._bind(bindee);
		}
		bindee._set_previous(this);  // VERY IMPORTANT - OVERRIDE SO REWIND DOESENT GO "INTO" LIST
		return bindee;
	}
//	this._pass_bind_function = function(outputName,fn)
	this._bind_function = function(outputName,fn)
	{
		for(element in this._elements)
		{
			this._elements[element]._bind_function(outputName,fn);
		}
	}
	
    this._in_instanciate = function(input)
    {   
		 let newObject=Object.assign({}, this); // Clone
		 newObject._elements=[]; // Instanciate and empty list
         return newObject._instanciate_processor();
    }

	this._offer_bind = function(match)
	{
		for(b in this)
		{
			if ((b == "_in_" + match) || (b.indexOf("_in_"+match+"_") == 0))
			{
				if ((b.indexOf("$")==(b.length-2)) || typeof(this[b+"@"]) == "undefined")
				{
					this[b+"@"] = true;
					//return new _call(this,this[b]);
					return this[b].bind(this);
					break;
				}
			}
		}

		for(element in this._elements)
		{
			let input_bound = this._elements[element]._offer_bind(match);
            
            // binding single output to multiple inputs?
            if (input_bound)
                return input_bound;
		}
	}
	this._add = function()
	{
		let inputs="";
        let args = Array.prototype.slice.call(arguments);
        Dawn.debugInfo("list adding "+args.length+ " elements");
        let self = this;
        args.forEach(function(element) {
			if (typeof(element)=="string")
	            element = resource._instanciate_processor()._lookup(element);
	        else/*
			if (typeof(element)=="function")
	            element = element();
	        else*/
	        if (element._isHolder)
	        {
	            let bindee = element._bindee;
	            element = resource._lookup(element._lookup,true);
	            element._bind(bindee);
	        }
			element = element._instanciate_processor(); //NEW
			element._set_owner(self);
            element["_in_go@"] = true; // occupy _go
            resource._elements.push(element._get_resource());
            self._elements.push(element);
        });
		return this;
	}
	    // javascript wrapper version for dawn defined function
    this._lookup = function(identifier, setOwner)
    {
      if (identifier.indexOf(":") == -1)
          throw "error lookup of "+identifier+": colon missing";
      if (identifier == ".")
          return this;
	  if (identifier.indexOf("input") == 0)
		  return new Resource("Input"); // should be created TODO NOTFIXED
			

      let ref = {_value:identifier, _scope:this._scope}; // is _scope used?
      // later set up output in ref and return the result of the output
      // ref._out_fob = new call(this,this.result) - ish
      let result;

  	  for(element in resource._elements)
	  {
		result = resource._elements[element]._instanciate_processor()._in_lookup_child(ref,true);
		if (result)
			return result;
	  }
          // otherwhise look in owner - move that here
       result= this._get_resource()._instanciate_processor()._in_lookup_child(ref);
	   
	   if (!result)
          throw "error lookup of "+identifier+": lookup failed";
      
      if (setOwner)
          result._set_owner(this);
      return result;
    }
	this._in_begin = function(scope)
	{
		for(element in this._elements)
		{
			if (this._elements[element])
				if (this._elements[element]._in_begin)
					this._elements[element]._in_begin();
		}
		if (this._bindee)
			this._bindee._in_begin(scope);
	}
	this._in_end = function(scope)
	{
		for(element in this._elements)
		{
			if (this._elements[element])
				if (this._elements[element]._in_end)
					this._elements[element]._in_end(scope);
		}
		if (this._bindee)
			this._bindee._in_end(scope);
        this.input_bound={};
	}
	this._in_go = function(scope)
	{
        Dawn.debugInfo("list going");
        return this._execute(scope,this._elements);
		/*
		for(element in this._elements)
		{
			if (this._elements[element])
            {
                scope._add_next_function(this._elements[element],this._elements[element]._in_go);
            }
		}
		// do not propagate _go - the bound list members calls on if needed
		//if (this._bindee)
        //{
        //    scope._add_next_function(this._bindee,this._bindee._in_go);
        //}
		
        return scope._execute_next_function(scope);
	    */
	}
	return this;
}
List.Processor = ListProcessor;
module.exports=List;