const Resource = Dawn.require("Content-Type/data/Resource");

function List() {
    Resource.call(this, "List");
    // elements in resource holds resources, children is for lookup
    this.elements = [];
    this.Processor = ListProcessor;
    this.owner = Dawn;

    return this;
}

function ListProcessor(resource) {
    Resource.Processor.call(this, resource);
    // elements in list holds processors
    this.elements = resource.elements.map(a => ({
        ...a
    })).map(a => a.instanciate_processor());
    this.connect = function(resource_to_connect_to) {
        this.connectee = resource_to_connect_to;
        for (element in this.elements) {
            //this.elements[element].set_previous(this);
            this.elements[element].connect(resource_to_connect_to);
        }
        //resource_to_connect_to.set_previous(this); // VERY IMPORTANT - OVERRIDE SO REWIND DOESENT GO "INTO" LIST
        return resource_to_connect_to;
    }
    this.connect_function = function(outputName, fn) {
        for (element in this.elements) {
            this.elements[element].connect_function(outputName, fn);
        }
    }

    this.in_instanciate = function(input) {
        let newObject = Object.assign({}, this); // Clone
        newObject.elements = []; // Instanciate and empty list
        return newObject.instanciate_processor();
    }

    this.previousOffer_connection = this.offer_connection;
    this.offer_connection = function(match) {
  
        for (element in this.elements) {
            let input_bound = this.elements[element].offer_connection(match);
            if (input_bound)
                return input_bound;
        }
        return this.previousOffer_connection(match);
    }
    this.add = async function() {
        let inputs = "";
        let args = Array.prototype.slice.call(arguments);
        Dawn.debugInfo("list adding " + args.length + " elements");
        for(elementIx in args)
        {
          element = args[elementIx];
          if (element)
          {
            if (typeof(element) == "string")
                element = await resource.default_processor().lookup(element);
            element = element.instanciate_processor(); //NEW
            element.set_owner(resource);
            element["_in_go@"] = true; // occupy _go
            resource.elements.push(element.get_resource());
            this.elements.push(element);
          }
        };
        return this;
    }
    // javascript wrapper version for dawn defined function
    this.previousLookup = this.lookup_new;
    this.lookup_new = async function(identifier, searchToRoot) {
        let result;
/*
why should a list lookup in its elements?
        for (element in resource.elements) {
            result = await resource.elements[element].default_processor().lookup_new(identifier, false);
            if (result)
                return result;
        }
*/
        if (!result)
            if (searchToRoot && resource.owner)
                result = await resource.owner.default_processor().lookup_new(identifier, searchToRoot);
 
        if (!result)
            result = await this.previousLookup(identifier,searchToRoot);

        if (!result)
        {
           // indicate error ? output_error is not bound
        } 


        return result;
    }
this.output_types = null;
this.get_output_types = function() {
//  if (!this.output_types)
  {
    this.output_types = new Set();
    for (elementIx in this.elements)
    {
      let element = this.elements[elementIx];
      this.output_types = this.output_types.union(element.get_output_types());
    }
  }

  return this.output_types;
}

    
    
    this.in_begin = function() {
        for (element in this.elements) {
            if (this.elements[element])
                this.elements[element]?.in_begin();
        }
        this.connectee?.in_begin?.();
    }
    this.in_end = function() {
        for (element in this.elements) {
            if (this.elements[element])
                this.elements[element]?.in_end();
        }
        this.connectee?.in_end?.();
        //this.input_bound={}; must be wrong?
    }

    this.in_go = function() {
        Dawn.debugInfo("list going");
        return this.execute(this.elements);
    }
    return this;
}
List.Processor = ListProcessor;
module.exports = List;