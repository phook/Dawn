const Resource  = Dawn.require("./dawn/Resource.js");
const fs   = Dawn.require('fs');
const path = Dawn.require('path');
const bnft = Dawn.require("./BNFT/BNFT.js");
function FileSystemResource(name, uri)
{
    if (!fs.existsSync(uri))
    {
        console.log("ERROR: FileSystemResource does not exist : "+uri);
        return;
    }
    
    let isDirectory = false;
    let isCompiledFile = false;
    let compiledExtension = "";

    this.initialize = function(name,in_uri)
    {
        
        let _isDirectory    = fs.lstatSync(in_uri).isDirectory();
        isDirectory    |= _isDirectory;

        if (!isCompiledFile && name.endsWith(".dawn_basic"))
        {
            isCompiledFile = true;
            compiledExtension = ".dawn_basic";
        }

        if (!compiledExtension.endsWith(".js") && name.endsWith(".dawn"))
        {
            isCompiledFile = true;
            compiledExtension = ".dawn";
        }

        if (name.endsWith(".js"))
        {
            isCompiledFile = true;
	        if (name.endsWith(".dawn.js"))
	            compiledExtension = ".dawn.js";
			else
	            compiledExtension = ".js";
        }

        if (_isDirectory)
        {
			let self = this;
            let selfProcessor = this._instanciate_processor();
            let resources = fs.readdirSync(in_uri);
            let lastName = "§";
            let newResource = null;
            resources.sort();
            resources.forEach(function (resource) {
                resourceuri = path.resolve(in_uri, resource); 
                if (resource.indexOf(lastName+".") === 0)
                {
                    self._children[lastName].initialize(resource,resourceuri);
                }
                else
                {
                    newResource = new FileSystemResource(resource,resourceuri);
					newResource._set_owner(this);
                    selfProcessor._add(newResource);
                    lastName = newResource._name;
                }
            });
        }
    }
    
    let full_name = name;
    
    name = name.replace(".js","");
    name = name.replace(/.dawn.*/,"");

    Resource.call(this,name);
    this._type= "FileSystemResource";
	this.Processor = FileSystemResourceProcessor;

    this.initialize(full_name,uri);
    
	function reportError(err)
	{
		console.log(err);
		Dawn.debugInfo(err);
	}
    this._compiled_object = null;
	this._compile = function()
	{
        if (isCompiledFile)
        {
            let sourceURI = uri.substr(0, (uri + '.').indexOf('.')) + compiledExtension;
            if (compiledExtension == ".js")
            {
                var loaded_object_constructor = Dawn.require(sourceURI);
                let fakeScope = new Resource("");
                fakeScope._owner = this._get_owner();
                var loaded_object = new loaded_object_constructor(fakeScope); // create initial instance
                this._owner._children[loaded_object._name]=loaded_object; // and register - replace FileObject - should it do this
                loaded_object._set_owner(this._owner);
				loaded_object._children = this._children;
				this._compiled_object = loaded_object;
				if (!this._compiled_object._in_instanciate) // if not precompiled
					this._compiled_object._in_instanciate=this.$_compiled_object._in_instanciate();
            }
            else
            if (compiledExtension == ".dawn.js")
            {
                let fakeScope = new Resource("");
                fakeScope._owner = this._get_owner();
                var loaded_object_constructor = Dawn.require(sourceURI);
                loaded_object_constructor(fakeScope);
                this._compiled_object = fakeScope._children[this._name];
				if (!this._compiled_object._in_instanciate) // if not precompiled
					this._compiled_object._in_instanciate=this.$_compiled_object._in_instanciate();
            }
            else
            {
                if (this.reentry)
                    throw "error - recursion - file resource "+this._name+" not compiled";
                this.reentry=true;
                
                var dawnSource = Dawn.resourceAsString(sourceURI);
				Dawn.debugInfo("SOURCE<"+sourceURI+">:"+dawnSource);
                if (compiledExtension == ".dawn_basic")
                {
                    var flavor = "basic"; //full_name.substring(full_name.indexOf(".dawn_")+6);
                    if (!Dawn.flavor_parser)
                    {
                        var source = Dawn.resourceAsString("dawn/Flavors/" + flavor + ".bnft");
                        Dawn.flavor_parser = new bnft(source, {alert:reportError, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});
                    }
					let flavorSource = dawnSource;
                    dawnSource = Dawn.flavor_parser.parse(dawnSource,{alert:reportError, fileToString: Dawn.resourceAsString,nonterminal:"TO_DAWN"});
					Dawn.debugInfo("FLAVOR_PARSE:"+dawnSource);
                    if (dawnSource == "ERROR")
                    {
                        throw "error in flavored dawn file: " + this._get_qualified_name() + " ";
                    }
                }

			    var jsSource = Dawn.parser.parse(dawnSource,{alert:reportError,nonterminal:"MODULE"});
				Dawn.debugInfo("DAWN_PARSE:"+jsSource);
                if (jsSource != "ERROR")
                {
                    var compiled_object_constructor=Dawn.requireBySource(jsSource);
	                var compiled_object = new compiled_object_constructor(this._owner); // create initial instance
// DO NOT REPLACE	                this._owner._children[compiled_object._name]=compiled_object; // and register - replace FileObject - should it do this
	                this._compiled_object = compiled_object;
					this._compiled_object._children = this._children;
					
					/// HERE CALL DAWN FUNCTION TO RUN ALL _in_ FUNCTIONS AND REPLACE THEM WITH THE RESULT
					
					if (!this._compiled_object._in_instanciate) // if not precompiled
						this._compiled_object._in_instanciate=this.$_compiled_object._in_instanciate();

				}
				else
					throw "error in dawn file: " + this._get_qualified_name() + " " + jsSource;			
			}
        }
        else
        {
            //normal file - treat as binary resource - with mime-conversion
            //conceptually all files could be this and "my" javascript file and dawn files could start with mark to allow inference
        }			
	}
	this._instanciate_processor = function()
	{
		if (!this._compiled_object)
			this._compile(null);
		if (this._compiled_object)
		 	return this._compiled_object._instanciate_processor();
		return new FileSystemResourceProcessor(this);
	}
	this._in_instanciate = function(flow)
	{
		if (!this._compiled_object)
			this._compile(flow);
		return this._compiled_object._in_instanciate(flow);
    }
	return this;
}
function FileSystemResourceProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._in_instanciate = function(flow)
	{
		if (!resource._compiled_object)
			resource._compile();
		let newObject = this._compiled_object._in_instanciate(flow);                
		newObject._children = this._children;
		return newObject;
    }
	return this;

	return this;
}
FileSystemResource.Processor = FileSystemResourceProcessor;
module.exports = FileSystemResource;