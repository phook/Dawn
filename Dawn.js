Dawn = {
    promises : [],
    isBrowser : function()
    {
        return typeof window !== 'undefined' && typeof window.document !== 'undefined';
    },
    isServer : function()
    {
        return !isBrowser();
    },
    requireBySource : function(source)
    {
        if (source.substr(0,10)==="(function(")
        { 
            var moduleStart = source.indexOf('{');
            var moduleEnd = source.lastIndexOf('})');
            var CDTcomment = source.indexOf('//@ ');
            if (CDTcomment>-1 && CDTcomment<moduleStart+6) moduleStart = source.indexOf('\n',CDTcomment);
            source = source.slice(moduleStart+1,moduleEnd-1); 
        } 
        var module = { exports:exports }; 
        var anonFn = new Function("require", "exports", "module", source);
        anonFn(this.require, exports, module);
        return module.exports;
    },   
    require : function(url, async_callback) 
    {
        var loadUrl = url;
        if (this.isBrowser())
        {
            if (!this.cache) 
              this.cache=[];
            var exports=this.cache[url]; 
            if (!exports) 
            {
                if (url.indexOf(".") !== 0)
                {
                    loadUrl = "https://jspm.dev/"+url;
                }
                try 
                {
                    if (!async_callback)
                    {
                        exports={};
                        var X=new XMLHttpRequest();
                        X.open("GET", loadUrl, 0); // sync
                        X.send();
                        if (X.status && X.status !== 200)
                          throw new Error(X.statusText);
                        var source = X.responseText;
                        /*
                        if (source.substr(0,10)==="(function(")
                        { 
                            var moduleStart = source.indexOf('{');
                            var moduleEnd = source.lastIndexOf('})');
                            var CDTcomment = source.indexOf('//@ ');
                            if (CDTcomment>-1 && CDTcomment<moduleStart+6) moduleStart = source.indexOf('\n',CDTcomment);
                            source = source.slice(moduleStart+1,moduleEnd-1); 
                        } 
                        source="//@ sourceURL="+window.location.origin+url+"\n" + source;
                        var module = { id: url, uri: url, exports:exports }; 
                        var anonFn = new Function("require", "exports", "module", source);
                        anonFn(require, exports, module);
                        require.cache[url]  = exports = module.exports; */
                        this.cache[url]  = exports = this.requireBySource(source); 
                    }
                    else
                    {
                        exports={};
                        var X=new XMLHttpRequest();
                        
                        function callback()
                        {
                            var source = this.responseText;
                            if (source.substr(0,10)==="(function(")
                            { 
                                var moduleStart = source.indexOf('{');
                                var moduleEnd = source.lastIndexOf('})');
                                var CDTcomment = source.indexOf('//@ ');
                                if (CDTcomment>-1 && CDTcomment<moduleStart+6) moduleStart = source.indexOf('\n',CDTcomment);
                                source = source.slice(moduleStart+1,moduleEnd-1); 
                            } 
                            source="//@ sourceURL="+window.location.origin+url+"\n" + source;
                            var module = { id: url, uri: url, exports:exports }; 
                            var anonFn = new Function("require", "exports", "module", source);
                            anonFn(require, exports, module);
                            require.cache[url]  = exports = module.exports; 
                            async_callback(exports);
                        }
                        
                        X.addEventListener("load", callback);
                        X.open("GET", loadUrl); 
                        X.send();
                    }
                } 
                catch (err) 
                {
                    throw new Error("Error loading module "+url+": "+err);
                }
            }
            return exports;
        }
        else
            return require(url);
    },
    Root : function(url)
    {
        if (Dawn.isBrowser())
        {
            const DawnWebDirectory = require("./dawn/DawnWebDirectory.js");
            this._instanciate_processor()._add(new DawnWebDirectory("dawn","dawn"));
        }
        else
        {
            const FileSystemResource = require("./dawn/FileSystemResource.js");
            this._instanciate_processor()._add(new FileSystemResource("dawn","dawn"));
        }
        this._path.push("dawn.");
        this._children["dawn"]._path.push("Operators.");
        this._children["dawn"]._path.push("Number.");
    },
    saveStringResource : function(url,string,overwrite) {
        if (Dawn.isBrowser())
        {
            throw new Error("save not supported in browser");
        }
        else
        {
            const fs = require("fs");
            if (overwrite || !fs.existsSync(url))
                fs.writeFileSync(url, string, function (err) {
              if (err) return console.log(err);
            });
            else
                console.log("file exists");
        }
    },
    resourceAsString : function(url)
    {
        if (Dawn.isBrowser())
        {
            var X=new XMLHttpRequest();
            X.open("GET", url, 0); // sync
            X.send();
            if (X.status && X.status !== 200)
              throw new Error(X.statusText);
            return X.responseText;
        }
        else
        {
            const fs = require("fs");
            return fs.readFileSync(url, {option:'utf8', function(err, source) {console.log("error reading "+url);throw err;}}).toString();
        }
    },
    initialize : function(rootUrl,evaluate, debug, consoleOutputFunction)
    {
        var evalInContext = function(str){
            return eval(str);
        };

        const Resource = require("./dawn/Resource.js");

        Resource.call(this,"");
        this.Root(rootUrl);

        const bnft = this.require("./BNFT/BNFT.js");

        this.bigRat = this.require("./BigInt_BigRat.min.js");

        this.passedEval = evaluate ? evaluate : evalInContext;

        this.parser = null;
        this.parser = new bnft(this.resourceAsString("./dawn/Flavors/dawn.bnft"), {alert:console.log,fileToString: Dawn.resourceAsString,path:"dawn/Flavors/",useCache:true});

        
        if (this.isBrowser())
        {
            this.debugInfo = function(s)
            {
                if (debug)
                    console.log(s);
            }
        }
        else
        {
            this.debugInfo = function(s)
            {
                if (debug)
                    console.log(s);
            }
/*
            const fs = require("fs");

            // clear log
            if (debug)
                fs.writeFile('log.txt', '', function(){});

            this.debugInfo = function(s)
            {
                if (debug)
                    root.appendFile('log.txt', s+"\n", function(){});
            }
            */
        }
    },
    Promise: function()
    {
        self=this;
        let promise = null;
        let settled = false;
        this.promise = function()
        {
            if (!promise)
            {
                promise=new Promise(function(resolve, reject) {
                    self.resolve = function(x,y,z)
                    {
                        if (!settled)
                        {
                            settled = true;
                            resolve(x,y,z);
                        }
                    }
                    self.reject  = function(x,y,z)
                    {
                        if (!settled)
                        {
                            settled = true;
                            reject(x,y,z);
                        }
                    };
                });
            } 
            return promise;
        }
        this.isSettled = function()
        {
            return settled;
        }
    },
    return_go: function(fn_to_go)
    {
        let boundFunction=null;
        return function(scope)
        {
            if (!boundFunction)
            {    
                boundFunction = fn_to_go.call(scope,scope); // this and parameter - 
                boundFunction._set_owner(scope); // set scope to owner (but not add - consider)
            }
            var result = boundFunction._in_go(scope);
            if (this.next)
            {
                if (!result)
                    this.next.call(this.next,scope);
                else
                {
                    scope._add_next_function(this,this.next);
                    // potentially return true - maybe promise instead - only 1 promise pr. async
                }
            }
        }
    },
    // this takes and array of flows
    return_program_go: function(program, input)
    {
        let boundFunction=null;
        return function(scope)
        {
            if (!boundFunction)
            {
                let previous=null;
                for(entry in program)
                {
                    let line=Dawn.return_go(program[entry]);
                    if (!boundFunction)
                        boundFunction=line;
                    if (previous)
                        previous.next=line;
                    previous=line;
                }
                if (boundFunction)
                    boundFunction.call(boundFunction,scope, input);
            }
            else
                boundFunction.call(boundFunction,scope,input);
        }
    },
    return_go: function(fn_to_go)
    {
        let boundFunction=null;
        return function(scope)
        {
            if (!boundFunction)
            {    
                boundFunction = fn_to_go.call(scope,scope); // this and parameter - 
                boundFunction._set_owner(scope); // set scope to owner (but not add - consider)
            }
            var result = boundFunction._in_go(scope);
            if (this.next)
            {
                if (!result)
                    this.next.call(this.next,scope);
                else
                {
                    scope._add_next_function(this,this.next);
                    // potentially return true - maybe promise instead - only 1 promise pr. async
                }
            }
        }
    },
    // this takes and array of flows - can probably be put into resource
    return_executable_function: function(program) // call with this as scope
    {
		//let processor = this._instanciate_processor();
		let boundArray = [];
		for(entry in program)
		{
			let boundFlow = program[entry].call(this);// this = scope?
			boundFlow._set_owner(this);
			boundArray.push(boundFlow); 
		}
		return function execute_flow(input) // call with this as scope
		{
			this._input = input;
			var processor = this._instanciate_processor();
			//processor._input = input;
			for(entry in boundArray)
			{
				processor._add_next_function(boundArray[entry], boundArray[entry]._in_go);
			}
			processor._execute_next_function(processor);
		}
    }
}
module.exports = Dawn;
