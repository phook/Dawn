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
	this._connect = function(resource_to_connect_to)
	{
		this._connectee = resource_to_connect_to;
		for(element in this._elements)
		{
	        //this._elements[element]._set_previous(this);
			this._elements[element]._connect(resource_to_connect_to);
		}
		resource_to_connect_to._set_previous(this);  // VERY IMPORTANT - OVERRIDE SO REWIND DOESENT GO "INTO" LIST
		return resource_to_connect_to;
	}
	this._connect_function = function(outputName,fn)
	{
		for(element in this._elements)
		{
			this._elements[element]._connect_function(outputName,fn);
		}
	}
	
    this._in_instanciate = function(input)
    {   
		 let newObject=Object.assign({}, this); // Clone
		 newObject._elements=[]; // Instanciate and empty list
         return newObject._instanciate_processor();
    }

	this._offer_connection = function(match)
	{
		if (!this._input_list)
			this._build_input_list();
		for(b in this._input_list)
		{
			if ((b == "_in_" + match) || (b.indexOf("_in_"+match+"_") == 0))
			{
				if ((b.indexOf("$")==(b.length-2)) || typeof(this[b+"@"]) == "undefined")
				{
					this[b+"@"] = true;
					return this[b].bind(this);
					break;
				}
			}
		}

		for(element in this._elements)
		{
			let input_bound = this._elements[element]._offer_connection(match);
            
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
			

      let ref = {_value:identifier}; 
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
	this._in_begin = function()
	{
		for(element in this._elements)
		{
			if (this._elements[element])
				this._elements[element]?._in_begin();
		}
		this._connectee?._in_begin();
	}
	this._in_end = function()
	{
		for(element in this._elements)
		{
			if (this._elements[element])
				this._elements[element]?._in_end();
		}
		this._connectee._in_end();
        //this.input_bound={}; must be wrong?
	}
  
	this._in_go = function()
	{
        Dawn.debugInfo("list going");
        return this._execute(this._elements);
	}
	return this;
}
List.Processor = ListProcessor;
module.exports=List;