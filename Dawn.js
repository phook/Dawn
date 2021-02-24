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
    require : function(url, async_callback) 
    {
        var loadUrl = url;
        if (this.isBrowser())
        {
            if (!require.cache) 
              require.cache=[];
            var exports=require.cache[url]; 
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
            DawnWebDirectory.call(this,"","dawn");
        }
        else
        {
            const Directory = require("./dawn/Directory.js");
            Directory.call(this,"","dawn");
        }
        this.path.push("Operators.");
        this.path.push("Number.");
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
            return fs.readFileSync(url, {option:'utf8', function(err, source) {console.log("error reading "+filename);throw err;}}).toString();
        }
    },
    initialize : function(rootUrl,evaluate, debug, consoleOutputFunction)
    {
        var evalInContext = function(str){
            return eval(str);
        };

        this.root = new this.Root(rootUrl);

        const bnft = this.require("./BNFT/BNFT.js");

        this.bigRat = this.require("./BigInt_BigRat.min.js");

        this.passedEval = evaluate ? evaluate : evalInContext;

        this.parser = null;
        this.parser = new bnft(this.resourceAsString("./dawn/Flavors/dawn.bnft"), console.log);

        
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
            const fs = require("fs");

            // clear log
            if (debug)
                fs.writeFile('log.txt', '', function(){});

            this.debugInfo = function(s)
            {
                if (debug)
                    root.appendFile('log.txt', s+"\n", function(){});
            }
        }
    }
}
module.exports = Dawn;
