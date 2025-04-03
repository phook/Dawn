let Dawn = {
    rootUrl : null,
    promises : [],
    isBrowser : function()
    {
        return typeof window !== 'undefined' && typeof window.document !== 'undefined';
    },
    isServer : function()
    {
        return !Dawn.isBrowser();
    },
    requireBySource : function(source,context)
    {
        if (source.substr(0,10)==="(function(")
        { 
            var moduleStart = source.indexOf('{');
            var moduleEnd = source.lastIndexOf('})');
            var CDTcomment = source.indexOf('//@ ');
            if (CDTcomment>-1 && CDTcomment<moduleStart+6) moduleStart = source.indexOf('\n',CDTcomment);
            source = source.slice(moduleStart+1,moduleEnd-1); 
        } 
        var module = { exports:source }; 
        var anonFn = new Function("require", "exports", "module", source);
        if (context)
          anonFn.bind(context);
          anonFn(Dawn.require, module.exports, module);
        return module.exports;
    },   
    require : function(url, path) 
    {
        if (!path)
          if (url.indexOf("/file:///") !== 0)
            if (this.rootUrl)
              path = this.rootUrl;
//        var loadUrl = url;
        if (this.isBrowser())
        {
            if (url.indexOf("file:") === 0)
              url = "/" + url;
            else
            if (url.indexOf("http:") !== 0)
            {
              if (path)
              {
                if (path.substr(-1) !== "/")
                {
                  path += "/";
                }
                url=path+url;
              }
            }
            if (url.toLowerCase().substr(-5)!=='.json') 
              if (url.toLowerCase().substr(-3)!=='.js') 
	              if (url.indexOf(".") === -1 && url.substr(-1) !== "/") 
	                url+='.dawn.js';                           
            if (!this.cache) 
              this.cache=[];
            var exports=this.cache[url]; 
            if (!exports) 
            {   
                /*
                if (url.indexOf(".") !== 0)
                {
                    loadUrl = "https://jspm.dev/"+url;
                }
                */
                try 
                {
/*
                    if (!async_callback)
                    {
*/
                        exports={};
                        var X=new XMLHttpRequest();
                        X.open("GET", url, 0); // sync
                        X.send();
                        if (X.status && X.status !== 200)
                          throw new Error(X.statusText);
                        var source = X.responseText;
                        
                        if (url.toLowerCase().substr(-5) ==='.json' || url.substr(-1) === "/") // json or dir
                          this.cache[url]  = exports = JSON.parse(source); 
                        else
                          this.cache[url]  = exports = this.requireBySource(source); 

                    /*
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
                    */
                } 
                catch (err) 
                {
                    /*throw new Error("Error loading module "+url+": "+err);*/
					return null;
                }
            }
            return exports;
        }
        else
            return require(url);
    },
    saveStringResource : function(url,string,overwrite) {
        if (this.isBrowser())
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
        if (this.isBrowser())
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
    debugInfo : function(text)
    {
    },
    execute : function(command, context, print)
    {
		/*
      if (context)
        context = Dawn.instanciate_processor().lookup(context);
      else
	  */
        context = Dawn;	
	  if (command.indexOf("Console:") == -1)
        command += ">>Console:";
      
      let jsSource = this.compiler.parse(command);

      if (jsSource != "ERROR")
      {
        function evalInContext(js, context) {
          return function() {
          return eval(js);
          }.call(context);
        }

        Dawn.print = function(string)
        {
          if (!Dawn.returnResult)
            Dawn.returnResult = "";

          Dawn.returnResult += string + "\n";
          
          if (print)
            print(string + "\n");
        }

        // ALL THIS COULD PROBABLY BE List.go() ??? so execute is hidden

        // Should get processor from context and eval in it
        let processor = context.instanciate_processor();
//        let program_lines = evalInContext("async function command() {let self=this; await "+jsSource+"}; command.call(this);",processor).then(foo => {
        evalInContext("let self=this;"+jsSource.replace("await","")+"",processor).then(command => {
            processor.execute([command]);
        });

      }        
    },
    initialize : async function(rootUrl)
    {
        if (this.isBrowser() && rootUrl.indexOf("file:///")===0)
           rootUrl="/"+rootUrl;
         
        this.rootUrl = rootUrl;

        const Resource = Dawn.require("Content-Type/data/Resource"); 

        Resource.call(this,"");

        const file = new (Dawn.require("Scheme/file"))("dawn",rootUrl);
        const FileProtocolProcessor = file.instanciate_processor();
        let dawnResource = (await FileProtocolProcessor.in_instanciate()).get_resource();
        this.instanciate_processor().add(dawnResource);
        this.path.push("dawn.");
        this.children["dawn"].path.push("Scheme."); // find schemes
        this.children["dawn"].path.push("Content-Type.data."); // find data types
        
        // hardcode - change
//        this.compiler = Dawn.require("file:///C:/Users/109600/Projects/Dawn/DawnCompiler.dawn.js");
        this.compiler = new (Dawn.require("DawnCompiler"))();


        
        if (this.isBrowser())
        {
            this.debugInfo = function(s)
            {
                //if (debug)
                //    console.log(s);
            }
        }
        else
        {
            this.debugInfo = function(s)
            {
                //if (debug)
                //    console.log(s);
            }
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
                boundFunction.set_owner(scope); // set scope to owner (but not add - consider)
            }
            var result = boundFunction.in_go(scope);
            if (this.next)
            {
                if (!result)
                    this.next.call(this.next,scope);
                else
                {
                    scope.add_next_function(this,this.next);
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
                boundFunction.set_owner(scope); // set scope to owner (but not add - consider)
            }
            var result = boundFunction.in_go(scope);
            if (this.next)
            {
                if (!result)
                    this.next.call(this.next,scope);
                else
                {
                    scope.add_next_function(this,this.next);
                    // potentially return true - maybe promise instead - only 1 promise pr. async
                }
            }
        }
    },
    // this takes and array of flows - can probably be put into resource
    return_executable_function: function(program) // call with this as scope
    {
		//let processor = this.instanciate_processor();
		let boundArray = [];
		for(entry in program)
		{
			let boundFlow = program[entry].call(this);// this = scope?
			boundFlow.set_owner(this);
			boundArray.push(boundFlow); 
		}
		return function execute_flow(input) // call with this as scope
		{
			this.input = input;
			var processor = this.instanciate_processor();
			//processor.input = input;
			for(entry in boundArray)
			{
				processor.add_next_function(boundArray[entry], boundArray[entry].in_go);
			}
			processor.execute_next_function(processor);
		}
    }
}
if (Dawn.isServer())
  module.exports = Dawn;
