const Resource = Dawn.require("Content-Type/data/Resource");

if (Dawn.isServer()) {
    const fs = Dawn.require('fs');
    const path = Dawn.require('path');
    const bnft = Dawn.require("./BNFT/BNFT.js");
    const DawnCompiler = Dawn.require("./DawnCompiler.js");

    const mime = require('mime-kind');
    const { createReadStream } = require('fs');

    var read_dir = async function(dirpath, hidden) {
        var jsdir = {};
        files = fs.readdirSync(dirpath)
        for(fileno in files)
        {
          let file = files[fileno];
            filepath = path.resolve(dirpath, file);
            if (!/^\./.test(file) || hidden)
                try {
                    if (file.endsWith(".dawn") || file.endsWith(".dawn.js"))
                    {
                      file = file.replace(".dawn","");
                      file = file.replace(".js","");
                      jsdir[file] = "application/dawn";
                    }
                    else
                    {
                      var stat = fs.statSync(filepath);
                      if (stat && stat.isDirectory() && typeof(jsdir[file]) == "undefined") {
                          jsdir[file] = "text/directory-json";
                      } else {
                         jsdir[file] = (await mime(createReadStream(filepath))).mime;
                      }
                    }
                } catch (e) {} 
        }
        return jsdir;
    }
    
    var read_contenttype = async function(url)
    {
    }
}
else
{ // IsBrowser
  var read_dir = async function(url, hidden) 
  {
    let requestUrl = url;
    if (url.indexOf(":/") == -1)
      requestUrl =window.location.protocol+"//"+window.location.host+window.location.pathname.substring(0,window.location.pathname.lastIndexOf("/"))+"/" + url;
    let request = new Request(requestUrl);

    let response = await fetch(request);
    if(response.ok)
    {
      return await response.json();
    } 
    else 
    {
      return {};
    }
  }

  var read_contenttype = async function(url)
  {
    let requestUrl = url;
    if (url.indexOf(":/") == -1)
      requestUrl =window.location.protocol+"//"+window.location.host+window.location.pathname.substring(0,window.location.pathname.lastIndexOf("/"))+"/" + url;
    let request = new Request(requestUrl,{method:"HEAD"});
    let response = await fetch(request);
    if(response.ok)
    {
      return await response.headers.get("Content-Type");
    } 
    else 
    {
      return "none";
    }
  }

//    let request = new Request(url,{method:"HEAD"}); - getting mime-type
//    .dawn or .dawn.js yields executable dawn object - this eats folders with same name
//    .dawn also yields a text/dawn
//    
}


function FileResource(name,url,contentType) {
  Resource.call(this, name ? name : "");
  this.Processor = FileResourceProcessor;
  this.url = url;
  this.contentType = contentType;
  return this;
}

function FileResourceProcessor(resource) {
    Resource.Processor.call(this, resource);

    this.populate_children = async function()
    {
      if (Object.keys(this.get_resource().children).length == 0)
      {
        resource.contentType = this.get_owner().children[resource.url.split("/").at(-1)].contentType;
        
        if (!resource.contentType)
            resource.contentType = await read_contenttype(resource.url);
        
          console.log(resource.contentType);
          if (resource.contentType.indexOf("text/directory-json") == 0 || resource.contentType.indexOf("application/dawn") == 0)
          {
            let json = await read_dir(resource.url)
              console.log(json);
              for(resourcename in json)
              {          
                this.add(new FileResource(resourcename, resource.url+"/"+resourcename, json[resourcename].mimetype));
                console.log(resourcename);
              }
          }
      }
    }

    this.in_instanciate = async function(data) {
      /*
      if (url.value !== "")
      {
        let deconstructedUrl = url.value.split('/')
        resource.name = deconstructedUrl.pop();
        resource.url = url.value;
 
        await this.populate_children();
      }
      */
      if (resource.contentType)
      {
        // FIND CONTENT TYPE 
        // REPLACE FILE TYPE WITH CORRECT AND INSTANCIATE THAT
        console.log(resource.url);
        let resourceSource = new (Dawn.require(resource.url))();
        let instance = resourceSource.in_instanciate(data); 
        instance.set_owner(this); // set as owner to inherit scope but do not become child
        if (resource.contentType == "application/dawn" || resource.contentType == "text/directory-json")
          await this.populate_children();
        if (this.get_resource().children)
          instance.get_resource().children = this.get_resource().children; // reference same children for back lookup 
        return instance;
      }
      
      return this;
    }
}
FileResource.Processor = FileResourceProcessor;
module.exports = FileResource;
