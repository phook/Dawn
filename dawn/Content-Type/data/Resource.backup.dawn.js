var id = 1;

function clone(src) {
    var clone = Object.assign({}, src);
    clone.inputs_bound = {};
    clone.previous = null;
    return clone;
}

function dawnSort(a, b) {
    if (b.indexOf(a) == 0) {
        return 1;
    }
    if (a.indexOf(b) == 0) {
        return -1;
    }
    return a > b ? 1 : -1;
}

function Resource(name, owner) {
    this._id = id++;
    this._path = [""];

    this._name = name;
    this._type = "Resource";
    this._it = 0;
    this._children = {};
    this._owner = owner ? owner : null;

    this.Processor = ResourceProcessor;
    this._instanciate_processor = function() {
        return new this.Processor(this);
    }
    this.defaultProcessor = null;

    this._in_instanciate = function(input) {
        return this._instanciate_processor()._in_instanciate(input);
    }
    this._get_resource = function() {
        return this;
    }
    this._set_owner = function(owner) {
        this._owner = owner;
    }
    this._get_owner = function(owner) {
        return this._owner;
    }
    this._clone = function() {
        return clone(this);
    }

    return this;
}


/*

  Build list of input functions
  Build list of outut functions

  at lookup:
  build list of possible inputs
  build list of possible outputs
  build list of possible outputs types (build from the possible outputs list)
  
  lookup builds list of all inputs, if inputs are not excplicitly listed: foo.bar/bleh?input&input&input
  explicitely specified inputs gets group removed
  foo.bar/bleh?input=1 only removes input from posible list
  possible list can replace connection array (catchall($) are not removed)
  
  lookup builds list of all outputs, if outputs are not excplicitly listed: foo.bar/bleh#output&output&output
  explicitely specified outputs gets group removed
  lookup can be overidden for excel, csv files to support http://example.com/data.csv#row=5-7 format (would be redirected to inputs in dawn)
  
  
  at connect:
  offer possible outputs to device connecting to
  accept outputs that matches the possible inputs
  
  groups outputs should be offered in orders
  include rules for groups - concept - first input connecting fixes the group number so now fewer are available
  same rule for outputs first output connecting fixes the group number so fewer are available
  
  group 0 (or no group) are always possible - begin, end, error, go?
  explicits are only available when mentioned in the in or output lists (lookup?)

*/
function ResourceProcessor(resource) {
    this._children_processors = {};
    this._get_resource = function() {
        return resource;
    }
    
    this.mythen = function(possiblePromise, fn)
    {
      if (possiblePromise)
        return possiblePromise.then(fn);
      else
        return fn();
    }
    
    this._lookup = async function(identifier) {
        if (identifier.indexOf(":") == -1)
            throw "error lookup of " + identifier + ": colon missing";
        if (identifier == ".")
            return this;

        if (identifier.indexOf("input:") == 0) {
            let name = identifier.replace("input:", "");
            if (this["__in_" + name + "_value"])
                return this["__in_" + name + "_value"];
        } else
        if (identifier.indexOf("output:") == 0) {
            let name = identifier.replace("output:", "");
            if (this["_out_" + name])
                return this["_out_" + name];
        }

        var ref = {
            _value: identifier
        };
        let result = await this._in_lookup_child(ref);

        if (!result) {
            if (identifier[0] != "*")
                console.log("error lookup of " + identifier + ": lookup failed");
            // send error to error output
            //throw "error lookup of " + identifier + ": lookup failed";
        }
        return result;
    }

    this._in_lookup = async function(string_name, from_owner, exclude) // if lookup should use _out_lookup instead of return - tail recursion should be used
    {
        let myName = this._get_resource()._name;
        if (string_name._value == myName)
            return this; //// NO THIS SHOULD BE A REFERENCE HOLDING THE FLOW RELATED INFO - BUT VALUE RETAINED IN ORIGINAL Resource
        if (myName == "")
            return this._in_lookup_child(string_name); // temp hack for root

        var originalResource = string_name._value;

        // remove own name from identifier - including delimeter/separator in this case "." (could be "/","\",":" etc.)
        var skip = false;
        let deref = "";
        
        if (string_name._value[0] === "*" || (myName.charAt(-1) != "." && string_name._value.indexOf(myName) == 0)) {
            if (string_name._value[0] === "*")
                myName = "*";
            deref = string_name._value[myName.length];
            if (deref == "?")
                string_name._value = string_name._value.substring(myName.length);
            else
                string_name._value = string_name._value.substring(myName.length + 1);
            if (deref == ".") {
                let result = await this._in_lookup_child(string_name, from_owner, exclude);
                if (result)
                    return result;
            } else if (deref == ":" || deref == "?") {
                let urlParametersToInputs = [];

                if (string_name._value.indexOf("?") !== -1) {
                    let parameters = string_name._value.substring(string_name._value.indexOf("?"));
                    string_name._value = string_name._value.substring(0, string_name._value.indexOf("?"));
                    //if (string_name._value.indexOf("|") !== -1) // if parameters AND input parameters
                    {
                        const URLparameters = /(?:\?|&|;)([^=]+)=([^&|;]*)/g;
                        const matchAll = parameters.matchAll(URLparameters);
                        let addAmpersand = false;
                        for (const match of matchAll) {
                            if (match[1].indexOf("|") === -1) {
                                string_name._value += (addAmpersand ? "&" : "") + match[1] + "=" + match[2];
                                addAmpersand = true;
                            } else {
                                if (match[1].indexOf("|") === 0) {
                                    urlParametersToInputs.push({
                                        input: match[1].substring(1),
                                        value: match[2]
                                    });
                                } else {
                                    Dawn.error("illegal URI \"|\" only allowed as first charachter in input parameters");
                                }
                            }
                        }
                    }
                }
                let result = await this._in_instanciate(string_name);
                if (result) {
                    for (let i in urlParametersToInputs) {
                        let type = "number";
                        let input = urlParametersToInputs[i].input;
                        let value = urlParametersToInputs[i].value;
                        if (value.indexOf("\"") == 0) {
                            value.replace("\"", "");
                            type = "string";
                            value = await this._lookup("String:" + value);
                        } else {
                            value = await this._lookup("Number:" + value);
                        }
                        let inputname = "_in_" + type + "_" + input;
                        if (inputname in result) {
                            result[inputname](value);
                            result.inputs_bound[inputname] = true; // to prevent bind errors
                        } else
                        if (inputname + "$e" in result) {
                            result[inputname + "$e"](value);
                            result.inputs_bound[inputname + "$e"] = true; // to prevent bind errors
                        }
                    }
                }
                return result;
            }
        }

        if (this._get_resource()._owner && !from_owner) {
            string_name._value = originalResource;
            return await this._get_resource()._owner._in_lookup(string_name, from_owner, this);
        }

        return null;
    }
    this._lookup_child = async function(identifier) {
        var ref = {
            _value: identifier
        };
        return await this._in_lookup_child(ref);
    }
    this._in_lookup_child = async function(string_name, from_owner, exclude) {
        var identifier = string_name._value;

        if (this._populate_children)
            await this._populate_children(string_name);

        var keys = Object.keys(this._get_resource()._children);
        keys.sort(dawnSort);

        for (testPath in this._get_resource()._path) // needs the first element to be ""
        {
            var identifierToCheck = this._get_resource()._path[testPath] + identifier;
            string_name._value = identifierToCheck;
            for (let id in keys) {
                if (this._get_resource()._children[keys[id]] != exclude) {
                    if (identifierToCheck == "*" || identifierToCheck.indexOf(keys[id]) == 0) {
                        var result = await this._get_resource()._children[keys[id]]._instanciate_processor()._in_lookup(string_name, true);
                        if (result)
                            return result;
                    }
                }
            }
        }
        if (this._get_resource()._owner && !from_owner)
            return await this._get_resource()._owner._instanciate_processor()._in_lookup_child(string_name, false, this);
        return null;
    }

    this._clone = function() {
        return clone(this);
    }

    this._out_begin = null;
    this._out_end = null;

    this.inputs_bound = {};

    this.previous = null;
    this.next = null;
    this._test_previous = function(_new_previous) {
        if (this == _new_previous) {
            throw ("circular reference");
        }
        if (this.previous) {
            if (_new_previous == this.previous) {
                throw ("circular reference");
            }
            return this.previous._test_previous(_new_previous);
        }
        return true;
    }
    this._set_previous = function(_previous) {
        _previous._test_previous(this);
        this.previous = _previous;
    }
    this._get_previous = function(_previous) {
        return this.previous;
    }
    this._set_next = function(_next) {
        this.next = _next;
    }
    this._get_next = function(_next) {
        return this.next;
    }

    this._set_owner = function(owner) {
        resource._owner = owner;
    }
    this._get_owner = function(owner) {
        return resource._owner ? resource._owner : this;
    }
    this._add = async function() {
        var args = Array.prototype.slice.call(arguments);
        var self = this;
        //args.forEach(function(child)
        for (childix in args) {
            let child = args[childix];
            if (child == "string")
                child = resource._lookup(child);

            child._get_resource()._set_owner(self._get_resource()); //nonoptimal
            var name = "";
            if (child._get_resource()._name)
                name = child._get_resource()._name;
            else
                name = "Ix" + resource._it++;
            resource._children[name] = child._get_resource();
            //				self._children_processors[name] = child._instanciate_processor(); SHOULD BE LIKE THIS
        }
        //);
        return this;
    }

    this._in_string_name$e = function(string_name) {
        resource._name = string_name._value;
    }

    this._in_instanciate = function(input) {
        let newObject = Object.assign({}, this); // Clone
        return newObject._instanciate_processor();
    }

    this._input_list = null;
    this._build_input_list = function() {
        this._input_list = {};
        for (b in this)
            if (b.indexOf("_in_") == 0)
                this._input_list[b] = this[b];
    }
    this._offer_connection = function(match) {
        if (!this._input_list)
            this._build_input_list();

        match = "_in_" + match;
        for (b in this._input_list) {
            let explicit = b.endsWith("$e");
            let all_outputs = b.endsWith("_$");
            let fullmatch = (b == match);
            let catchall = (b == match + "_$");
            let type_match = (match.indexOf(b) == 0) || (b.indexOf(match) == 0);
            let explicit_match = (explicit && b == match + "$e");
            if (fullmatch ||
                catchall ||
                type_match ||
                explicit_match) {
                // inputs ending with $ takes all outputs
                if ((all_outputs) || typeof(this.inputs_bound[b]) == "undefined") {
                    this.inputs_bound[b] = true;

                    let newBoundFunction = this[b].bind(this);
                    newBoundFunction._boundThis = this;
                    newBoundFunction._outputName = match.replace("_in_", "");;
                    return newBoundFunction;
                    break;
                }
            }
        }
    }
    this._connect = function(resource_to_connect_to) {
        if (typeof(resource_to_connect_to) == "string") {
            let result = resource._lookup(resource_to_connect_to, true);
            if (!result)
                result = this._get_resource()._lookup(resource_to_connect_to); //nonoptimal
            resource_to_connect_to = result;
        }


        resource_to_connect_to._set_previous(this);
        this._connectee = resource_to_connect_to;

        Dawn.debugInfo("trying to bind " + resource._name + " to " + resource_to_connect_to._name);
        for (let a in this) {
            if (a.indexOf("_out_") == 0) {
                match = a.substr(5);

                // HERE DETECT IF resource_to_connect_to IS ResourceNotFound
                // IF IT IS DEDUCT THE OUTPUT TYPE AND LOOKUP IN THAT SCOPE WITH URI FROM ResourceNotFound 

                let input_bound = resource_to_connect_to._offer_connection(match)

                if (input_bound) {
                    Dawn.debugInfo("binding " + resource._name + " to " + resource_to_connect_to._name);
                    this[a] = input_bound;
                }
            }
        }

        return resource_to_connect_to;
    }

    this._connect_function = function(outputName, fn) {
        if (("_out_" + outputName) in this)
            this["_out_" + outputName] = fn;
    }


    this._in_native$ = function(data) {
        Function(data._value).call(this);
    }

    this._in_begin = function() {
        if (this._out_begin)
            this._out_begin();
    }

    this._in_end = function() {
        if (this._out_end)
            this._out_end();
        this.inputs_bound = {};
        this.bindee = null;
        this.previous = null;
    }
    this._in_go = function() {}
    this._get_qualified_name = function() {
        if (this._previous)
            return this._previous._get_qualified_name() + "." + resource._name;
        return resource._name;
    }
    this._first = function() {

        if (this.previous) {
            var first = this.previous;

            var loopTest = [first];

            while (first._get_previous()) {
                first = first._get_previous();
                loopTest.forEach(function(element) {
                    if (first == element) {
                        throw "circular ref error";
                    }
                });
                loopTest.push(first);
            }
            return first;
        } else {
            return this;
        }
    }

    this._add_next_function_at = 0;
    this._nextFunction = [];
    this._add_next_function = function(context, fn) {
        if (!fn)
            fn = context._in_go; // default input to call
        if (fn)
            this._nextFunction.splice(this._add_next_function_at, 0, fn.bind(context)); // javscript bind to bind function to resource
        this._add_next_function_at++;
    }


    this._execute_next_function = function() {
        this._add_next_function_at = 0;
        while (this._nextFunction.length) {
            let fn = this._nextFunction.shift();
            let result = fn();
            if (result)
                return result;
        }
    }


    // NEW CONCEPT FOR LINES - CONTAINS FLOWS - CALLS _in_go, promise is return if async, if promise is returned - it sets execution to continue at resolve
    this._execute = function(array_of_lines) {
        while (array_of_lines.length) {
            let flowForThisLine = array_of_lines.shift();
            let result = flowForThisLine._in_go();
            if (result) {
                return result.promise().then(function() {
                    this.execute(array_of_lines);
                });
            }
        }
    }

    this._execute_fn = function(array_of_lines) {
        while (array_of_lines.length) {
            let flowForThisLine = array_of_lines.shift();
            let result = flowForThisLine();
            if (result) {
                result.promise().then(function() {
                    return this.execute(array_of_lines);
                });
            }
        }
    }

    // little dirty - make sure that resources and processers are called correctly
    this._instanciate_processor = function() {
        return this;
    }
    return this;
}
Resource.Processor = ResourceProcessor;
module.exports = Resource;