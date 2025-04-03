const Resource = Dawn.require("Content-Type/data/Resource");

function _Flow() {
    Resource.call(this, "Flow");
    // elements in resource holds resources, children is for lookup
    this.elements = [];
    this.Processor = FlowProcessor;
    this.owner = Dawn;
    return this;
}

function FlowProcessor(resource) {
    Resource.Processor.call(this, resource);
    this.connect = function(resource_to_connect_to) {
        if (resource.elements.length > 0)
            resource.elements.at(-1).connect(resource_to_connect_to);
        return resource_to_connect_to;
    }
    this.connect_function = function(outputName, fn) {
        if (resource.elements.length > 0)
            resource.elements.at(-1).default_processor().connect_function(outputName, fn);
    }

    this.add = async function() {
        let args = Array.prototype.slice.call(arguments);
        for (childIx in args) {
            let child = args[childIx];
            if (child)
            {
              if (typeof(child) == "string") {
                  child = await resource.default_processor().lookup(child);
              }
              if (typeof(child) == "function") {
                  if (resource.elements.length > 0)
                      resource.elements.at(-1).connect_function(child.outputName, child);
                  child = child.boundThis; //NEW - dont know if this is right
              } else
              if (resource.elements.length > 0) {
                  child = child.instanciate_processor();
                  resource.elements.at(-1)?.connect(child);
              } else {
                  child = child.instanciate_processor();
                  
                  // attach this for start functions 
                  if (child.in_begin)
                    child.in_begin = child.in_begin.bind(child);
                  if (child.in_go)
                    child.in_go = child.in_go.bind(child);
                  if (child.in_end)
                    child.in_end = child.in_end.bind(child);
                  
                  // should be removed from input list
        
              }
                
              // Flow stores processors
              resource.elements.push(child);
              child.set_owner(resource);
            }
            else
            {
              resource.elements.push(null);
            }
        };

        return this;

    }
    // javascript wrapper version for dawn defined function
    
    this.previousLookup = this.lookup_new;
    this.lookup_new = async function(identifier, searchToRoot) {
        let result;

        let previousElement = resource.elements.at(-1);
        if (previousElement)
        {
          let output_types_of_previous = Array.from(previousElement.get_output_types());
          for(outputType in output_types_of_previous)
          {
            let lookupScope = await this.previousLookup("*."+output_types_of_previous[outputType]+":", true);
            if (lookupScope)
              result = await lookupScope.lookup_new(identifier,false);
            if (result)
              return result;
          }
        }
        /*
        for (element in resource.elements) {
            result = await resource.elements[element]?.default_processor().lookup_new(ref.value, false);
            if (result)
                return result;
        }
        */
        if (!result)
            if (searchToRoot && resource.owner)
                result = await resource.owner.default_processor().lookup(identifier, searchToRoot);

        if (!result)
            result = this.previousLookup(identifier,searchToRoot);

        if (!result)
        {
           // indicate error ? output_error is not bound
        } 

          
        return result;
    }

    this.in_instanciate = function(input) {
        let newObject = Object.assign({}, this); // Clone
        newObject.elements = []; // Instanciate and empty list
        return newObject.instanciate_processor();
    }

    this.in_go = function() {
        if (resource.elements.length > 0) {
            this.program = [
                resource.elements.at(0).in_begin,
                resource.elements.at(0).in_go,
                resource.elements.at(0).in_end
            ];
            this.execute_fn(this.program);
        }
    }


    return this;
}
_Flow.Processor = FlowProcessor;
module.exports = _Flow;