const Resource  = Dawn.require("./dawn/Resource.js");
const bnft = Dawn.require("./BNFT/BNFT.js");
currentIdentifiers = new Array();
currentIdentifiers.remove = function(){
    var what, a= arguments, L= a.length, ax;
    while(L && this.length){
        what= a[--L];
        while((ax= this.indexOf(what))!= -1){
            this.splice(ax, 1);
        }
    }
    return this;
}

/*

THE WEBFILE SHOULD REMOVE ITSELF - AND LET THE DEFINE ALTER THE TREE, SO THE CONFLICT DOESNT EXITS
ALSO FOR FILE!!!
AND AT INSTANCIATION PUT FLAVOR->COMPILE TO WEB WORKER (ON BROWSER)
NO - JUST PROMISE - THAT CAN ALTER IT LATER
SO MOVE COMPILE TO INSTANCE TIME, NOT LOOKUP TIME 
*/


function DawnWebFile(name)
{
    var dawnFile = false; //name.indexOf(".dawn") != -1;
    var flavoredFile = false;// name.indexOf(".dawn_") != -1;
    var full_name = name;
    
    
    var trimname = name.replace(".js","");
    trimname = trimname.replace(/.dawn.*/,"");
    Resource.call(this,trimname);
    
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
        var identifier = pipe._value;
        if (currentIdentifiers.includes(identifier))
            return;
        currentIdentifiers.push(identifier);
        if (identifier.indexOf(this._name) == 0)
        {
            if (dawnFile)
            {
                var dawnSource = Dawn.resourceAsString(this._get_qualified_name());
				Dawn.debugInfo("SOURCE<"+this._get_qualified_name()+">:"+dawnSource);
                if (flavoredFile)
                {
                    var flavor = full_name.substring(full_name.indexOf(".dawn_")+6);
                    if (!Dawn.flavor_parser)
                    {
                        var source = Dawn.resourceAsString("dawn/Flavors/" + flavor + ".bnft");
                        Dawn.flavor_parser = new bnft(source, {alert:reportError, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});
                    }
                    dawnSource = Dawn.flavor_parser.parse(dawnSource,{alert:reportError, fileToString: Dawn.resourceAsString,nonterminal:"TO_DAWN_BASE"});
					Dawn.debugInfo("FLAVOR_PARSE:"+dawnSource);
                    if (dawnSource == "ERROR")
                    {
                        currentIdentifiers = currentIdentifiers.remove(identifier);
                        throw "error in flavored dawn file: " + identifier + " ";
                    }
                }
                var jsSource = Dawn.parser.parse(dawnSource,{alert:reportError,nonterminal:"PROGRAM"});
				Dawn.debugInfo("DAWN_PARSE:"+jsSource);
                if (jsSource != "ERROR")
                {
                    // Save cached compile - and require it?
                    // eval in owners scope
                    //Dawn.passedEval.call(this._get_owner(),jsSource);
                    Function(jsSource).call(this._get_owner());
                    currentIdentifiers = currentIdentifiers.remove(identifier);
                    return this._owner._lookup(identifier); // a little hacky
                }
                currentIdentifiers = currentIdentifiers.remove(identifier);
                throw "error in dawn file: " + identifier + " " + jsSource;
            }
            else
            {
                // load, add to pool, call _lookup and return if result
                var qualified_name = this._get_qualified_name();
                if (qualified_name.indexOf(":") == -1)
                    qualified_name = "./" + qualified_name;

/*
                var loaded_object_constructor = Dawn.require(qualified_name);
                var loaded_object = new loaded_object_constructor(); // create initial instance
                this._owner._children[loaded_object._name]=loaded_object; // and register - replace FileObject - should it do this
    //            if (name === identifier)
    //                   return loaded_object; // do not return the original prototype - allow it to instance (possible use lookup)
                currentIdentifiers.remove(identifier);
*/
                var fob_inserter = Dawn.require(qualified_name);
                delete this._owner._children[identifier];
                fob_inserter(this._owner); // call inserter with scope
                currentIdentifiers = currentIdentifiers.remove(identifier);
                return this._owner._lookup(identifier);
            }
        }
        else
        {
            currentIdentifiers = currentIdentifiers.remove(identifier);
            return this._parent_lookup(pipe);
        }
    }
 /*
not work because owner is not know...hm
 
    // ASYNC TEST
    if (name.indexOf(".js") != -1)
    {
                var qualified_name = this._get_qualified_name() + ".js";
                if (qualified_name.indexOf(":") == -1)
                    qualified_name = "./dawn/" + qualified_name;
                Dawn.require(qualified_name, function(fob_inserter)
                {
                    delete this._owner._children[identifier];
                    fob_inserter(this._owner); // call inserter with scope
                });
    }
*/
}

module.exports = DawnWebFile;