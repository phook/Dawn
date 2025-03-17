const Resource = Dawn.require("Content-Type/data/Resource");

function _Flow() {
    Resource.call(this, "Flow");
    // elements in resource holds resources, children is for lookup
    this._elements = [];
    this.Processor = FlowProcessor;
    this._owner = Dawn;
    return this;
}

function FlowProcessor(resource) {
    Resource.Processor.call(this, resource);
    this._connect = function(resource_to_connect_to) {
        if (resource._elements.length > 0)
            resource._elements.at(-1)._connect(resource_to_connect_to);
        return resource_to_connect_to;
    }
    this._connect_function = function(outputName, fn) {
        if (resource._elements.length > 0)
            resource._elements.at(-1)._instanciate_processor()._connect_function(outputName, fn);
    }

    this._add = async function() {
        let args = Array.prototype.slice.call(arguments);
        for (childIx in args) {
            let child = args[childIx];
            if (typeof(child) == "string") {
                child = await resource._instanciate_processor()._lookup(child);
            }
            if (typeof(child) == "function") {
                if (resource._elements.length > 0)
                    resource._elements.at(-1)._connect_function(child._outputName, child);
                child = child._boundThis; //NEW - dont know if this is right
            } else
            if (resource._elements.length > 0) {
                child = child._instanciate_processor();
                resource._elements.at(-1)._connect(child);
            } else {
                child = child._instanciate_processor();
                
                // block inputs
                child["_in_begin@"] = true;
                child["_in_go@"]    = true;
                child["_in_end@"]   = true;
                
                // attach this for start functions 
                if (child._in_begin)
                  child._in_begin = child._in_begin.bind(child);
                if (child._in_go)
                  child._in_go = child._in_go.bind(child);
                if (child._in_end)
                  child._in_end = child._in_end.bind(child);
      
            }
            // Flow stores processors
            resource._elements.push(child);
            child._set_owner(resource);
        };

        return this;

    }
    // javascript wrapper version for dawn defined function
    this._lookup = async function(identifier, setOwner) {
        if (identifier.indexOf(":") == -1)
            throw "error lookup of " + identifier + ": colon missing";
        if (identifier == ".")
            return this;
        if (identifier.indexOf("input") == 0)
            return new Resource("Input"); // should be created TODO NOTFIXED


        let ref = {
            _value: identifier
        };
        let ref1 = {
            _value: "*." + identifier
        };
        let result;

        for (element in resource._elements) {
            result = await resource._elements[element]._instanciate_processor()._lookup(ref1._value, true);
            if (result)
                return result;
        }
        // otherwhise look in owner - move that here
        result = await this._get_resource()._instanciate_processor()._in_lookup_child(ref);

        if (!result)
            throw "error lookup of " + identifier + ": lookup failed";

        if (setOwner)
            result._set_owner(this);
          
        // IF NO RESULT FOUND CALL RESOURCE IMPLEMENTATION
          
        return result;
    }

    this._in_instanciate = function(input) {
        let newObject = Object.assign({}, this); // Clone
        newObject._elements = []; // Instanciate and empty list
        return newObject._instanciate_processor();
    }

    this._in_go = function() {
        if (resource._elements.length > 0) {
            this._program = [
                resource._elements.at(0)._in_begin,
                resource._elements.at(0)._in_go,
                resource._elements.at(0)._in_end
            ];
            this._execute_fn(this._program);
        }
    }


    return this;
}
_Flow.Processor = FlowProcessor;
module.exports = _Flow;