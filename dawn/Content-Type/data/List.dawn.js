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
            const el = this.elements[element];
            el.connect(resource_to_connect_to);
            // the elements' lifecycle (out_begin/out_end) stays list-driven:
            // unwire what el.connect bound, so a re-runnable dispatch list
            // doesn't multi-fire connected accumulators through the elements'
            // end wiring (flow elements have an empty outputList here, so
            // their internal wiring stands)
            for (const output in el.outputList) {
                const kind = output.substr(4);
                if (kind === "begin" || kind === "end") el[output] = null;
            }
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
        // a go / go_then signal STARTS the list: every flow's head replays
        // (one if sentence gates a whole list of connection flows). go_else
        // is absorbed: the gate said no, the guarded flows must not fire
        // (otherwise go_else prefix-matches the first flow's in_go).
        if (match === "go" || match === "go_then")
            return this.in_go.bind(this);
        if (match === "go_else")
            return function() {};

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
            // var declarations instantiate the type as a named object and
            // introduce it as a URI in the script's scope (see Flow.dawn)
            let elemResource = element.get_resource && element.get_resource();
            if (elemResource && elemResource.varName && !element.isVarReference)
            {
                await element.introduceVar();
                let introduced = elemResource.introduced || elemResource;
                resource.children[elemResource.varName] = introduced;
                introduced.varElement = element;
                let scope = resource;
                while (scope.owner && scope.owner.children) scope = scope.owner; // topmost named-child scope
                if (scope !== resource)
                    scope.children[elemResource.varName] = introduced;
            }
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
      this.output_types = new Set([...this.output_types, ...element.get_output_types()]);
    }
  }

  return this.output_types;
}


    this.out_List = null;
    this.out_octetstream = null;
    this.in_octetstream_$all = function(input) {
		let specs = JSON.parse(new TextDecoder().decode((input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value))));
		resource.elements = [];
		this.elements = [];
		for (let spec of specs) {
			let proc = buildElement(spec);
			if (!proc) continue;
			resource.elements.push(proc.get_resource());
			this.elements.push(proc);
		}
    };
    // the self-type input: a List value flows in, this list adopts its elements
    this.in_List_$all = function(input) {
        const src = (input && input.get_resource) ? input.get_resource() : input;
        if (!src || !src.elements) return;
        resource.elements = src.elements.slice();
        this.elements = resource.elements.map(a => ({
            ...a
        })).map(a => a.instanciate_processor());
    };
    this.toBlob = function() {
		return new TextEncoder().encode(JSON.stringify(resource.elements.map(serializeElement)));
    };
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
        //the self-type output: the list itself flows out at cycle end
        this.out_List?.(this.get_resource());
        //this.input_bound={}; must be wrong?
    }
    this.in_go = function() {
        Dawn.debugInfo("list going");
        // a copy: dispatch lists (one if gating many flows) fire per request
        // and must keep their elements; execute() shifts as it runs
        return this.execute(this.elements.slice());
    }
    return this;
}
function serializeElement(el) {
    let name = el.name;
    if (name === "String")  return { type: "String",  value: el.value };
    if (name === "Number")  return { type: "Number",  value: el.value && el.value.toString ? el.value.toString() : String(el.value) };
    if (name === "Boolean") return { type: "Boolean", value: !!el.value };
    if (name === "octetstream")    return { type: "octetstream",    value: Dawn.u8ToBase64(el.value || new Uint8Array(0)) };
    if (name === "List")    return { type: "List",    value: (el.elements || []).map(serializeElement) };
    return { type: "Data",    value: el.value !== undefined ? el.value : null };
}
function buildElement(spec) {
    if (spec && spec.type === "List") {
        let sub = new List();
        sub.elements = (spec.value || []).map(buildElement).filter(p => p).map(p => p.get_resource());
        return sub.instanciate_processor();
    }
    let value = spec ? spec.value : null;
    if (spec && spec.type === "octetstream" && typeof value === "string") value = Dawn.base64ToU8(value);
    return Dawn.castValue(spec && spec.type, value);
}
List.Processor=ListProcessor;
module.exports = List;
