function require_simple(url)
{
    if (url.toLowerCase().substr(-3)!=='.js') 
      url+='.js'; 
    if (!require.cache) 
      require.cache=[];
    var exports=require.cache[url]; 
    if (!exports) 
    {
            try 
            {
                exports={};
                var X=new XMLHttpRequest();
                X.open("GET", url, 0); // sync
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
            catch (err) 
            {
                throw new Error("Error loading module "+url+": "+err);
            }
    }
    return exports; 
}

async function require_browser_remote(url)
{
	return await import('https://dev.jspm.io/' + url);
}

var isBrowser = new Function("try {return this===window;}catch(e){ return false;}");
var hasLocalHostedModules = function() {return false;}; // test whether node modules are served locally


var using=null;
if (isBrowser())
{
	if (hasLocalHostedModules())
	{
	}
	else
	{
		using = require_browser_remote;
	}
}