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
              // var declarations instantiate the type as a named object and
              // introduce it as a URI in the script's scope: the local scope
              // (this flow) for same-flow references, plus the topmost owner
              // (the program root) so later statements/flows can find it too
              let childResource = child.get_resource && child.get_resource();
              if (childResource && childResource.varName && !child.isVarReference)
              {
                  await child.introduceVar();
                  let introduced = childResource.introduced || childResource;
                  resource.children[childResource.varName] = introduced;
                  introduced.varElement = child;
                  let scope = resource;
                  while (scope.owner && scope.owner.children) scope = scope.owner; // topmost named-child scope
                  if (scope !== resource)
                      scope.children[childResource.varName] = introduced;
              }

              this.output
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
        if (!result)
            if (searchToRoot && resource.owner)
                result = await resource.owner.default_processor().lookup(identifier, searchToRoot);

        if (!result)
            result = this.previousLookup(identifier,searchToRoot);
        return result;
    }
    this.previousOffer = this.offer_connection;
    this.offer_connection = function(match) {
        let own = this.previousOffer(match);
        if (own)
            return own;
        for (let ix in resource.elements) {
            let el = resource.elements[ix];
            if (el && el.offer_connection) {
                let bound = el.offer_connection(match);
                if (bound)
                    return bound;
            }
        }
    }
	this.get_output_types = function() {
        let previousElement = resource.elements.at(-1);
        if (previousElement)
			return previousElement.get_output_types();
		return new Set();
	}

    this.in_instanciate = function(input) {
        let newObject = Object.assign({}, this); // Clone
        newObject.elements = []; // Instanciate and empty list
        return newObject.instanciate_processor();
    }

    this.in_begin = function() {
        const head = resource.elements.at(0);
        if (head) head.in_begin?.();
        this.out_begin?.();
    }
    this.in_end = function() {
        const head = resource.elements.at(0);
        if (head) head.in_end?.();
        this.out_end?.();
    }
    this.in_go = function() {
        const head = resource.elements.at(0);
        if (head) {
            this.program = [
                head.in_begin,
                head.in_go,
                head.in_end
            ];
            this.execute_fn(this.program);
        }
    }


    return this;
}
_Flow.Processor = FlowProcessor;
module.exports = _Flow;
