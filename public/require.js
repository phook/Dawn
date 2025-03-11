function require(url, path)
{
    if (path)
    {
      if (path.substr(-1) !== "/")
      {
        path += "/";
      }
      url=path+url;
    }
    if (url.toLowerCase().substr(-5)!=='.json') 
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
                if (url.toLowerCase().substr(-5)!=='.json') 
                {
                  source="//@ sourceURL="+window.location.origin+url+"\n" + source;
                  var module = { id: url, uri: url, exports:exports }; 
                  var anonFn = new Function("require", "exports", "module", source);
                  anonFn(require, exports, module);
                  require.cache[url]  = exports = module.exports; 
                }
                else
                {
                  require.cache[url]  = exports = JSON.parse(source); 
                }
            } 
            catch (err) 
            {
                throw new Error("Error loading module "+url+": "+err);
            }
    }
    return exports; 
}