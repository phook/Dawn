var id = 1;

function clone(src) {
    var clone = Object.assign({}, src);
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
    this.Processor = ResourceProcessor;

    this.path = [""];
    this.name = name;
    this.type = "Resource";

    this.children = {};
    this.owner = owner ? owner : null;

    this.instanciate_processor = function() {
        return new this.Processor(this);
    }

    this.default_processor_instance = null;
    this.default_processor = function() {
      if (!this.default_processor_instance)
        this.default_processor_instance = new this.Processor(this);
      return this.default_processor_instance;
    }

    this.in_instanciate = function(input) {
        return this.instanciate_processor().in_instanciate(input);
    }
    this.get_resource = function() {
        return this;
    }
    this.set_owner = function(owner) {
        this.owner = owner;
    }
    this.get_owner = function(owner) {
        return this.owner;
    }
    this.clone = function() {
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

  _$all               - does not disappear from input list when connected
  _$explicit          - does only appear in list if explicitly mentioned
  _$group_name        - groups inputs, so if one is connected all other groups are removed

  >>NewInput:Boolean:minuend&tag=all
  >>NewInput:Boolean:minuend&group=name
*/
const isInput    = "in_";
const isOutput   = "out_";
const isExplicit = "_$explicit";
const isCatchAll = "_$all";
const isGroup    = "_$group_";

const protectedFunctions = ["in_go","in_begin","in_end","in_error","out_begin","out_end","out_error"];

function ResourceProcessor(resource) {
    this.get_resource = function() {
        return resource;
    }

    this.mythen = function(possiblePromise, fn) {
        if (possiblePromise)
            return possiblePromise.then(fn);
        else
            return fn();
    }


    this.inputList = {};
    this.outputList = {};
    this.output_types = null;
    this.endParameters = {};
 
    this.lookup = async function(identifier) {
        return await this.lookup_new("*."+identifier,true);
      }
    this.lookup_new = async function(identifier, searchToRoot) {
        if (typeof(searchToRoot)=="undefined")
            searchToRoot=true;
        if (identifier.indexOf(":") == -1) {
            this.out_error?.({
                value: "Colon missing from identifier: " + identifier
            });
            return null;
        }
        
        let deref = "";
        let name = resource.name;
        let nextIdentifier = "";
        let wildcard = identifier.indexOf("*.") === 0;
        if (wildcard || identifier.indexOf(resource.name) == 0) {
        if (wildcard)
            name = "*";
        deref = identifier[name.length]; // first character after name is derefence

        if (deref == "?")
            nextIdentifier = identifier.substring(name.length);
        else
            nextIdentifier = identifier.substring(name.length + 1);

        if (deref == ".") {
            if (this.populate_children)
                await this.populate_children(identifier);

            let keys = Object.keys(resource.children);
            keys.sort(dawnSort);

            for (ix in resource.path) // needs the first element to be ""
            {
                identifierToCheck = resource.path[ix] + nextIdentifier;
                for (let id in keys) {
                    if (identifierToCheck.indexOf(keys[id]) == 0) {
                        var result = await resource.children[keys[id]].default_processor().lookup_new(identifierToCheck,false);
                        if (result)
                            return result;
                    }
                }
            }
            if (searchToRoot && resource.owner)
                return await resource.owner.default_processor().lookup_new(identifier, true);
        } else if (deref == ":" || deref == "?") {
 
            let result = await this.in_instanciate({value:nextIdentifier});
            if (result) {
 
                // build default input and output lists for binding - excluding explicit ones
                let keys = Object.keys(result);
                keys.filter((input)  => input.indexOf(isInput)   === 0 && input.indexOf(isExplicit)  === -1).forEach((input)  => result.inputList[input]   = result[input]);
                keys.filter((output) => output.indexOf(isOutput) === 0 && output.indexOf(isExplicit) === -1).forEach((output) => result.outputList[output] = result[output]);

                let urlParametersToInputs = [];

                inputsAndOutputs = nextIdentifier.split("?");
                inputsAndOutputs = inputsAndOutputs.at("-1").split("#")
                let inputs = [];
                let outputs = [];
                if (nextIdentifier.indexOf("?") !== -1 && nextIdentifier.indexOf("#") !== -1) {
                    inputs = inputsAndOutputs.at(0).split("&").filter(val => val !== '');
                    outputs = inputsAndOutputs.at(1).split("&").filter(val => val !== '');
                } else
                if (nextIdentifier.indexOf("?") !== -1)
                    inputs = inputsAndOutputs.at(0).split("&").filter(val => val !== '');
                else
                if (nextIdentifier.indexOf("#") !== -1)
                    outputs = inputsAndOutputs.at(1).split("&").filter(val => val !== '');


                // Check for explicit in/outputs and adjust in/outputlists accordingly
                let inputsCleared = false;
                for (let inputIx in inputs) {
                    let input = inputs[inputIx];
                    if (input.indexOf("|") == 0 && input.indexOf("=") !== -1) // assign input with VALUE
                    {
                        let pair = input.split("=");
                        urlParametersToInputs.push({
                            input: pair[0].substring(1),
                            value: pair[1]
                        });
                    } else
                    if (input.indexOf("=") === -1) {
                        if (input.indexOf("|") === 0) input = input.substring(1);
                        if (!inputsCleared)
                        {
                           inputsCleared=true;
                           Object.keys(result.inputList).forEach(key=>{if (!protectedFunctions.includes(key)) delete result.inputList[key];});
                        }
                        let inputFullName = keys.find(v => v.indexOf("_" + input) != -1); // possible error if input is foo and fooBAR is returned
                        if (inputFullName)
                        {
                           result.inputList[inputFullName] = result[inputFullName];
                        }
                    }
                }
                let outputsCleared = false;
                for (let outputIx in outputs) {
                    let output = outputs[outputIx];
                    if (output.indexOf("|") == 0)
                    {
                      output = output.substring(1);
                      if (!outputsCleared)
                      {
                         outputsCleared=true;
                         Object.keys(result.outputList).forEach(key=>{if (!protectedFunctions.includes(key)) delete result.outputList[key];});
                      }
                      let outputFullName = keys.find(v => v.indexOf("_" + output) != -1); // possible error if input is foo and fooBAR is returned
                      if (outputFullName)
                      {
                         result.outputList[outputFullName] = result[outputFullName];
                      }
                    }
                }
 
                for (let i in urlParametersToInputs) {
                    let type = "";
                    let constInput = null;
                    let input = urlParametersToInputs[i].input;
                    let value = urlParametersToInputs[i].value;
                    if (value.indexOf("\"") == 0) {
                        value.replace("\"", "");
                        type = "String";
                        constInput = await this.lookup("String:" + value);
                    } else
                    if (["true", "false"].includes(value.toLowerCase())) {
                        type = "Boolean";
                        constInput = await this.lookup("Boolean:" + value);
                    } else {
                        type = "Number";
                        constInput = await this.lookup("Number:" + value);
                    }
                    let inputname  = "in_"  + type + "_" + input;
                    let outputname = "out_" + type;
                    if (inputname in result) {
                        result.endParameters[inputname]=constInput.get_resource();
                        result.inputList[inputname]=undefined;
                    } else
                    if (inputname + "_$explicit" in result) {
                        result.endParameters[inputname + "$explicit"]=constInput.get_resource();
                        result.inputList[inputname+ "_$explicit"]=undefined;
                    }
                }
                result.build_output_types();
                return result;

            }


        }
    }

}

this.clone = function() {
    return clone(this);
}

this.out_begin = null;
this.out_end = null;
this.out_error = null;

this.set_owner = function(owner) {
    resource.owner = owner;
}
this.get_owner = function(owner) {
    return resource.owner ? resource.owner : this;
}
this.add = async function() {
    var args = Array.prototype.slice.call(arguments);
    var self = this;
    //args.forEach(function(child)
    for (childix in args) {
        let child = args[childix];
        if (child == "string")
            child = resource.lookup(child);

        child.get_resource().set_owner(self.get_resource()); //nonoptimal
        var name = "";
        if (child.get_resource().name)
            name = child.get_resource().name;
        else
            name = "Ix" + resource.it++;
        resource.children[name] = child.get_resource();
        //				self.children_processors[name] = child.instanciate_processor(); SHOULD BE LIKE THIS
    }
    //);
    return this;
}

this.in_string_name$e = function(string_name) {
    resource.name = string_name.value;
}

this.in_instanciate = function(input) {
    let newObject = Object.assign({}, this); // Clone
    return newObject.instanciate_processor();
}

this.build_input_list = function() {
    this.input_list = {};
    for (fn in this)
        if (fn.indexOf("in_") == 0)
            this.input_list[fn] = this[fn];
}

this.build_output_types = function() {
    let outputList = [];
    let outputTypes=[];
    Object.keys(this).filter((output) => output.indexOf(isOutput) === 0 && output.indexOf(isExplicit) === -1).forEach((output) => outputList.push(output));
    for (outputIx in outputList)
    {
      let output = outputList[outputIx].replace("out_","");
      let index=output.indexOf("_");
      if (index === -1)
        index = output.length+1;
      if (output[0] == output[0].toUpperCase())
        outputTypes.push(output.slice(0,index));
    }
    this.output_types = new Set(outputTypes);
}

this.get_output_types = function() {
  if (!this.output_types)
    this.build_output_types();
  return this.output_types;
}

this.offer_connection = function(match) {
    if (!this.input_list)
        this.build_input_list();

    // order - check explicits, then type


    match = "in_" + match;
    for (input in this.input_list) {
        let explicit    = input.endsWith(isExplicit);
        let fullmatch   = (input == match);
        let catchall    = (input == match + isCatchAll);
        let type_match  = (match.indexOf(input) == 0) || (input.indexOf(match) == 0);
        let explicit_match = (explicit && input == match + "$e");
        if (fullmatch  ||
            catchall   ||
            type_match ||
            explicit_match) 
        {
          let newBoundFunction = this[input].bind(this);
          
          if (!catchall)
            delete this.input_list[input]; // remove from list
          
          // here if group selected, remove all other groups from list
          
          return newBoundFunction;
        }
    }
}



// connect rules:
// Only offer outputs to inputs in the lists
// filter for _$all, _$explicit, _$group
// when a group is connected remove all other groups from list

this.connect = function(resource_to_connect_to) {
  /*
    if (typeof(resource_to_connect_to) == "string") {
        let result = resource.lookup(resource_to_connect_to, true);
        if (!result)
            result = this.get_resource().lookup(resource_to_connect_to); //nonoptimal
        resource_to_connect_to = result;
    }
  */
    this.connectee = resource_to_connect_to;

    for (let output in this.outputList) {
        let input_connected = resource_to_connect_to.offer_connection(output.substr(4))

        if (input_connected) {
            this[output] = input_connected;
        }
    }

    return resource_to_connect_to;
}
/*
this.connect_function = function(outputName, fn) {
    if (("out_" + outputName) in this)
        this["out_" + outputName] = fn;
}
*/

this.in_native$ = function(data) {
    Function(data.value).call(this);
}

this.in_begin = function() {
  this.out_begin?.();
}

this.fire_end_parameters=function()
{
  for(parameter in this.endParameters)
    this[parameter](this.endParameters[parameter]);
}

this.in_end = function() {
  this.fire_end_parameters();
  this.out_end?.();
}
this.in_go = function() {}
this.get_qualified_name = function() {
    if (this.previous)
        return this.previous.get_qualified_name() + "." + resource.name;
    return resource.name;
}

this.add_next_function_at = 0;
this.nextFunction = [];
this.add_next_function = function(context, fn) {
    if (!fn)
        fn = context.in_go; // default input to call
    if (fn)
        this.nextFunction.splice(this.add_next_function_at, 0, fn.bind(context)); // javscript bind to bind function to resource
    this.add_next_function_at++;
}


this.execute_next_function = function() {
    this.add_next_function_at = 0;
    while (this.nextFunction.length) {
        let fn = this.nextFunction.shift();
        let result = fn();
        if (result)
            return result;
    }
}


// NEW CONCEPT FOR LINES - CONTAINS FLOWS - CALLS _in_go, promise is return if async, if promise is returned - it sets execution to continue at resolve
this.execute = function(array_of_lines) {
    while (array_of_lines.length) {
        let flowForThisLine = array_of_lines.shift();
        let result = flowForThisLine.in_go();
        if (result) {
            return result.promise().then(function() {
                this.execute(array_of_lines);
            });
        }
    }
}

this.execute_fn = function(array_of_lines) {
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
this.instanciate_processor = function() {
    return this;
}
this.default_processor = function() {
    return this;
}
return this;
}
Resource.Processor = ResourceProcessor;
module.exports = Resource;