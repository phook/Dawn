function File(name)
{
    var Dawn = require("../Dawn.js");
    var fs = require('fs');
    var path = require('path');

    var dawnFile = name.indexOf(".dawn") != -1;
    var flavoredFile = name.indexOf(".dawn_") != -1;
    var full_name = name;
    
    name = name.replace(".js","");
    name = name.replace(/.dawn.*/,"");
    Dawn.Fob.call(this,name);
    this._get_qualified_name = function()
    {
        if (this._owner)
            return this._owner._get_qualified_name() + "/" + full_name;
        return this._name;
    }
    this._parent_lookup = this._in_lookup;
	function reportError(err)
	{
		console.log(err);
		Dawn.debugInfo(err);
	}
	this._in_lookup = function(pipe)
	{
        var identifier = pipe.resource;
        if (identifier.indexOf(this._name) == 0)
        {
            if (dawnFile)
            {
                var dawnSource = Dawn.fileToString(this._get_qualified_name());
				Dawn.debugInfo("SOURCE<"+this._get_qualified_name()+">:"+dawnSource);
                if (flavoredFile)
                {
                    var flavor = full_name.substring(full_name.indexOf(".dawn_")+6);
                    if (!Dawn.flavor_parser)
                    {
                        var source = Dawn.fileToString("dawn/Flavors/" + flavor + ".bnft");
                        Dawn.flavor_parser = new Dawn.bnft(source, {alert:reportError, fileToString: Dawn.fileToString, path:"dawn/Flavors/"});
                    }
                    dawnSource = Dawn.flavor_parser.parse(dawnSource,{alert:reportError, fileToString: Dawn.fileToString,nonterminal:"TO_DAWN_BASE"});
					Dawn.debugInfo("FLAVOR_PARSE:"+dawnSource);
                    if (dawnSource == "ERROR")
                    {
                        throw "error in flavored dawn file: " + identifier + " ";
                    }
                }
                var jsSource = Dawn.parser.parse(dawnSource,{alert:reportError,nonterminal:"PROGRAM"});
				Dawn.debugInfo("DAWN_PARSE:"+jsSource);
                if (jsSource != "ERROR")
                {
                    // Save cached compile - and require it?
                    // eval in owners scope
                    Dawn.passedEval.call(this._get_owner(),jsSource);
                    return this._owner._lookup(identifier); // a little hacky
                }
                throw "error in dawn file: " + identifier + " " + jsSource;
            }
            else
            {
                // load, add to pool, call _lookup and return if result
                var qualified_name = this._get_qualified_name();
                var loaded_object_constructor = require(qualified_name);
                var loaded_object = new loaded_object_constructor(); // create initial instance
                this._owner._children[loaded_object._name]=loaded_object; // and register - replace FileObject - should it do this
    //            if (name === identifier)
    //                   return loaded_object; // do not return the original prototype - allow it to instance (possible use lookup)
                return this._owner._lookup(identifier)
            }
        }
        else
            return this._parent_lookup(pipe);
    }
}

module.exports = File;