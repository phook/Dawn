function File(name)
{
    var self = this;
    var Fob = require("./Fob.js");
    var fs = require('fs');
    var path = require('path');

    var dawnFile = name.indexOf(".dawn") != -1;
    var flavoredFile = name.indexOf(".dawn_") != -1;
    var full_name = name;
    
    name = name.replace(".js","");
    name = name.replace(/.dawn.*/,"");
    Fob.call(self,name);
    self._type="File";
    self._get_qualified_name = function()
    {
        if (self._owner)
            return self._owner._get_qualified_name() + "/" + full_name;
        return self._name;
    }
    self._parent_lookup = self._in_lookup;
	self._in_lookup = function(pipe)
	{
        var identifier = pipe.resource;
        if (identifier.indexOf(self._name) == 0)
        {
            if (dawnFile)
            {
                var dawnSource = Fob.fileToString(self._get_qualified_name());
                if (flavoredFile)
                {
                    var flavor = full_name.substring(full_name.indexOf(".dawn_")+6);
                    if (!Fob.flavor_parser)
                    {
                        var source = Fob.fileToString("dawn/Flavors/" + flavor + ".bnft");
                        Fob.flavor_parser = new Fob.bnft(source, {alert:console.log, fileToString: Fob.fileToString, path:"dawn/Flavors/"});
                    }
                    dawnSource = Fob.flavor_parser.parse(dawnSource,{alert:console.log, fileToString: Fob.fileToString,nonterminal:"TO_DAWN_BASE"});
                    if (dawnSource == "ERROR")
                    {
                        throw "error in flavored dawn file: " + identifier + " ";
                    }
                }
                console.log(dawnSource);
                var jsSource = Fob.parser.parse(dawnSource,{alert:console.log,nonterminal:"PROGRAM"});
                if (jsSource != "ERROR")
                {
                    console.log(jsSource);
                    // Save cached compile - and require it?
                    // eval in owners scope
                    Fob.passedEval.call(this._get_owner(),jsSource);
                    return self._owner._lookup(identifier); // a little hacky
                }
                throw "error in dawn file: " + identifier + " " + jsSource;
            }
            else
            {
                // load, add to pool, call _lookup and return if result
                var loaded_object_constructor = require(self._get_qualified_name());
                var loaded_object = new loaded_object_constructor(); // create initial instance
                loaded_object     = new loaded_object_constructor(loaded_object._type);  // then create real named for the typename
                loaded_object._name = loaded_object._type;//or is it _type - they should merge into the same at some stage
                Fob.root._add(loaded_object); // and register - replace FileObject - should it do self
    //            if (name === identifier)
    //                   return loaded_object; // do not return the original prototype - allow it to instance (possible use lookup)
                return new loaded_object_constructor(identifier);
            }
        }
        else
            return self._parent_lookup(pipe);
    }
}

module.exports = File;