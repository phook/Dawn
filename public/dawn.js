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
    // ── casting library (was Scheme/cast) — shared by the loading schemes ──
    // cast(contentType, bytes, url): a loaded thing becomes the right resource
    // for its content — never by the extension or scheme the author guessed
    // beforehand. Resolution walks the dawn tree, first hit wins:
    // Content-Type.<type>.<subtype>, Content-Type.<type>, then the built-in
    // defaults (text/* → data.String, image/svg+xml → data.String,
    // application/json → data.Data, anything else → application.octetstream).
    // The found resource is fed the raw bytes through its octetstream
    // interface; the true content-type is stamped on it (reply paths prefer it).
    cast : async function(contentType, bytes, url)
    {
        contentType = (contentType || "").split(";")[0].trim().toLowerCase();
        let u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
        const root = Dawn.instanciate_processor();
        let slash = contentType.indexOf("/");
        let type    = slash === -1 ? "" : contentType.substring(0, slash);
        let subtype = slash === -1 ? "" : contentType.substring(slash + 1);
        let candidates = [];
        if (type && subtype) candidates.push("Content-Type." + type + "." + subtype + ":");
        if (type)            candidates.push("Content-Type." + type + ":");
        if (type === "text") candidates.push("Content-Type.data.String:");
        if (contentType === "image/svg+xml") candidates.push("Content-Type.data.String:");
        if (contentType === "application/json") candidates.push("Content-Type.data.Data:");
        candidates.push("Content-Type.application.octetstream:");
        for (let id of candidates)
        {
            let proc = null;
            try { proc = await root.lookup(id); } catch (e) { proc = null; }
            if (!proc) continue;
            let blobInput = proc.in_octetstream_$all || proc.in_octetstream;
            if (blobInput)
            {
                blobInput.call(proc, { value: u8 });
                proc.get_resource().contentType = contentType; // reply paths prefer the true type
                return proc;
            }
        }
        return null;
    },
    // castValue(type, value): the native-value sibling — wraps an already-typed
    // JS value (string, BigRational, boolean, object, Uint8Array) in its own
    // resource, ready for late-connect (connect + in_go). Used by the List
    // operators, whose element types are known only at execution time — a list
    // can mix any types, so no static out_<Type> port can be declared.
    castValue : function(type, value)
    {
        let res = null;
        if (type === "String")  res = new (Dawn.require("Content-Type/data/String"))();
        if (type === "Number")  res = new (Dawn.require("Content-Type/data/Number"))();
        if (type === "Boolean") res = new (Dawn.require("Content-Type/data/Boolean"))();
        if (type === "Data")    res = new (Dawn.require("Content-Type/data/Data"))();
        if (type === "octetstream")    res = new (Dawn.require("Content-Type/application/octetstream"))();
        if (!res) return null;
        res.value = value;
        let proc = res.instanciate_processor();
        // populate the output list the way lookup_new does — connect() can only
        // offer plugs that are listed
        Object.keys(proc)
            .filter((output) => output.indexOf("out_") === 0 && output.indexOf("_$explicit") === -1)
            .forEach((output) => proc.outputList[output] = proc[output]);
        return proc;
    },
    // base64 helpers (Uint8Array ↔ base64), used by octetstream serialization in List
    u8ToBase64 : function(u8)
    {
        if (typeof Buffer !== "undefined") return Buffer.from(u8).toString("base64");
        let s = "";
        for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
        return btoa(s);
    },
    base64ToU8 : function(b64)
    {
        if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
        let s = atob(b64);
        let u8 = new Uint8Array(s.length);
        for (let i = 0; i < u8.length; i++) u8[i] = s.charCodeAt(i);
        return u8;
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
                        exports={};
                        var X=new XMLHttpRequest();
                        X.open("GET", url, 0); // sync
                        X.send();
                        if (X.status && X.status !== 200)
                          throw new Error(X.statusText);
                        var source = X.responseText;
                        
                        if (url.toLowerCase().substr(-5) ==='.json' || url.substr(-1) === "/") // json or dir
                          this.cache[url]  = exports = JSON.parse(source); // parse jsons
                        else
                        if (url.toLowerCase().substr(-3) ==='.js') // "compile" js
                          this.cache[url]  = exports = this.requireBySource(source);
                        else
                          this.cache[url]  = exports = source; // return text
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
        Dawn.print = print;
        let processor = context.instanciate_processor();
        // same execution as dawn_run.js: compile to an async fn, call it as the
        // processor, trigger the resulting flow
        const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;
        return (new AsyncFn("return " + jsSource)).call(processor)
          .then(list => { if (list) list.in_go(); })
          .catch(e => { if (print) print(String(e && e.stack || e) + "\n"); });
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
        this.children["dawn"].path.push("Content-Type.application."); // find content-types (json:, octetstream:…)
        
        // hardcode - change
//        this.compiler = Dawn.require("file:///C:/Users/109600/Projects/Dawn/DawnCompiler.dawn.js");
        this.compiler = new (Dawn.require("DawnCompiler"))();

		FileProtocolProcessor.populate_children();
        
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
