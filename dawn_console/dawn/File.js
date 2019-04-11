function File(name)
{
    var self = this;
    var Fob = require("./Fob.js");
    var fs = require('fs');
    var path = require('path');

    var dawnFile = name.indexOf(".dawn") != -1;
    
    name = name.replace(".js","");
    name = name.replace(".dawn","");
    Fob.call(self,name);
    self._type="File";
    self._get_qualified_name = function()
    {
        if (self._owner)
            return self._owner._get_qualified_name() + "/" + self._name;
        return self._name;
    }
	self._lookup = function(identifier)
	{
        if (identifier.indexOf(self._name) == 0)
        {/*
            if (dawnFile)
            {
                var dawnSource = fs.readFileSync(self._get_qualified_name() + ".dawn", {encoding:'utf8'});
                var jsSource = Fob.parser.parse(dawnSource);
                if (jsSource != "ERROR")
                {
                    // Save cached compile - and require it?
                    return Fob.passedEval(jsSource);
                }
                throw "error in dawn file";
            }
            else*/
            {
                // load, add to pool, call _lookup and return if result
                var loaded_object_constructor = require(self._get_qualified_name() + ".js");
                var loaded_object = new loaded_object_constructor(); // create initial instance
                loaded_object     = new loaded_object_constructor(loaded_object._type);  // then create real named for the typename
                loaded_object._name = loaded_object._type;//or is it _type - they should merge into the same at some stage
                Fob.root._add(loaded_object); // and register - replace FileObject - should it do self
    //            if (name === identifier)
    //                   return loaded_object; // do not return the original prototype - allow it to instance (possible use lookup)
                return new loaded_object_constructor(identifier);
            }
        }
    }
}

module.exports = File;