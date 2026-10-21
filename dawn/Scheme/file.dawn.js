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
        // Directory listing entry shape: { contentType, size, time } — must match dawn_console.js
        var fdat = {
          contentType : "",
          size        : 0,
          time        : 0
        }
        let files = fs.readdirSync(dirpath)
        for(let fileno in files)
        {
          let file = files[fileno];
            let filepath = path.resolve(dirpath, file);
            if (!/^\./.test(file) || hidden)
                try {
                    if (file.endsWith(".dawn") || file.endsWith(".dawn.js"))
                    {
                      file = file.replace(".dawn","");
                      file = file.replace(".js","");
                      jsdir[file] = Object.assign({},fdat);
                      jsdir[file].contentType = "application/dawn";
                    }
                    else
                    {
                      var stat = fs.statSync(filepath);
                      if (stat && stat.isDirectory() && typeof(jsdir[file]) == "undefined") {
                          jsdir[file] = Object.assign({},fdat);
                          jsdir[file].contentType = "text/directory-json";
                          jsdir[file].size = stat.size;
                          jsdir[file].time = stat.mtimeMs;
                      } else {
                         jsdir[file] = Object.assign({},fdat);
                         jsdir[file].contentType = (await mime(createReadStream(filepath))).mime;
                         jsdir[file].size = stat.size;
                         jsdir[file].time = stat.mtimeMs;
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
      try { return await response.json(); } catch (e) { return {}; }
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


// file:<path>?read — the file as a data source: in_go emits the content as a String.
// (mirrors the write/append sink; reading uses a selection, not an input)
// file:<path>?read — the file as a data source: in_go loads the content and
// loads the content as bytes; the resource found for the content-type in
// the Content-Type tree parses them through its blob interface, then
// late-connects that value to the next resource in the flow. Same late-cast
// philosophy as http: — the type is only known after loading.
function FileReadProcessor(resource) {
    Resource.Processor.call(this, resource);
    const EXT_TO_TYPE = {
        ".txt":"text/plain", ".md":"text/markdown", ".dawn":"text/dawn", ".html":"text/html",
        ".xml":"text/xml", ".json":"application/json",
        ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".gif":"image/gif",
        ".webp":"image/webp", ".svg":"image/svg+xml",
        ".js":"text/javascript", ".css":"text/css", ".ico":"image/x-icon",
        ".woff":"font/woff", ".woff2":"font/woff2"
    };
    this.in_go = function() {
        const self = this;
        const ext = (resource.url.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
        let extType = EXT_TO_TYPE[ext];
        if (!extType && Dawn.isServer()) {
            try { extType = Dawn.require("mime-types").lookup(ext) || undefined; } catch (e) { extType = undefined; }
        }
        if (!extType) extType = "application/octet-stream";
        if (Dawn.isServer()) {
            try {
                const _fs = Dawn.require('fs');
                const bytes = _fs.readFileSync(resource.url);
                // Dawn-promise continuation: resolves after cast + reply
                const p = new Dawn.Promise();
                p.promise(); // install resolve/reject before the async work
                Dawn.cast(extType, bytes, resource.url).then(cast => {
                    if (cast && self.connectee) { cast.connect(self.connectee); cast.in_begin?.(); cast.in_go?.(); cast.in_end?.(); }
                    p.resolve();
                });
                return p;
            } catch (e) {
                this?.out_error?.({ value: "file: read failed: " + e.message });
            }
            return;
        }
        const src = "/" + (resource.url.startsWith("/") ? resource.url.substring(1) : resource.url);
        fetch(src)
          .then(async r => {
              if (!r.ok) { self?.out_error?.({ value: "file: read failed (" + r.status + ")" }); return; }
              const contentType = r.headers.get("content-type") || extType;
              const bytes = new Uint8Array(await r.arrayBuffer());
              let cast = await Dawn.cast(contentType, bytes, resource.url);
              if (cast && self.connectee) { cast.connect(self.connectee); cast.in_begin?.(); cast.in_go?.(); cast.in_end?.(); }
          })
          .catch(e => self?.out_error?.({ value: "file: read failed: " + e.message }));
    }
}

// file: used as a data sink — the input that receives content after begin
// decides the operation; write and append are mutually exclusive.
// Created fresh for every file:<path>?write|append reference.
function FileSinkProcessor(resource) {
    Resource.Processor.call(this, resource);
    this.in_begin = function() {
        this.operation = null;
        this.content = null;
        this.out_begin?.();
    }
    function fileInput(operation) {
        return function(input) {
            if (this.operation && this.operation !== operation)
                return this?.out_error?.({value: "file: write and append are mutually exclusive"});
            this.operation = operation;
            this.content = input.value;
        };
    }
    this.in_String_write  = fileInput("write");
    this.in_String_append = fileInput("append");
    this.in_octetstream_write  = fileInput("write");
    this.in_octetstream_append = fileInput("append");
    this.in_end = function() {
        this.fire_end_parameters();
        if (this.operation && Dawn.isServer()) {
            const _fs = Dawn.require('fs');
            try {
                let data = (this.content instanceof Uint8Array) ? Buffer.from(this.content) : this.content;
                if (this.operation === "write")  _fs.writeFileSync(resource.url, data);
                if (this.operation === "append") _fs.appendFileSync(resource.url, data);
            } catch (e) {
                return this?.out_error?.({value: "file: " + this.operation + " failed: " + e.message});
            }
        }
        this.out_end?.();
    }
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
      if (Object.keys(this.get_resource().children).length == 0 && !this.get_resource().json)
      {
        resource.contentType = this.get_owner()?.children[resource.url.split("/").at(-1)]?.contentType;

        if (!resource.contentType)
            resource.contentType = await read_contenttype(resource.url);

        if (!resource.contentType && Dawn.isServer()) {
            const _path = Dawn.require('path');
            const _fs   = Dawn.require('fs');
            const abs   = _path.resolve(resource.url);
            try { if (_fs.statSync(abs).isDirectory()) resource.contentType = 'text/directory-json'; } catch(e) {}
        }

        let isDir = resource.contentType && resource.contentType.indexOf("text/directory-json") == 0;
        if (!isDir && resource.contentType && resource.contentType.indexOf("application/dawn") == 0 && Dawn.isServer()) {
            const _path = Dawn.require('path');
            const _fs   = Dawn.require('fs');
            try { isDir = _fs.statSync(_path.resolve(resource.url)).isDirectory(); } catch(e) {}
        }
        let json = null;
        if (!isDir && !Dawn.isServer()) {
            // browser: the parent listing holds a single entry per name, but a
            // resource may be BOTH a module (X.dawn.js / X.dawn) and a folder (X/)
            // of children (Number + Number/add…). Ask the server directly.
            try {
                let probe = await read_dir(resource.url);
                if (probe && Object.keys(probe).length) { json = probe; isDir = true; }
            } catch (e) {}
        }
        if (isDir)
          {
            if (!json) json = await read_dir(resource.url);
            for(resourcename in json)
            {
              let entry = json[resourcename];
              // Listing entries are objects { contentType, size, time } — fall back to raw string for compat
              let contentType = (typeof entry === "object" && entry !== null) ? entry.contentType : entry;
              this.add(new FileResource(resourcename, resource.url+"/"+resourcename, contentType));
            }
            this.get_resource().json=json;
          }
      }
    }

    this.in_instanciate = async function(data) {
      // file:<path>?write / ?append: the file as a data sink (writes).
      // Any other file: URI keeps the loader role — path resolution is the
      // module system, don't hijack it.
      let raw = (data && data.value) ? data.value : "";
      let sinkMode = null;
      if (raw.indexOf("?write") !== -1) sinkMode = "write";
      if (raw.indexOf("?append") !== -1) sinkMode = "append";
      if (raw.indexOf("?read") !== -1) sinkMode = "read";
      if (sinkMode) {
        let url = raw.split("?")[0];
        if (sinkMode === "read")
          return new FileReadProcessor({ url: url });
        return new FileSinkProcessor({ url: url });
      }
      if (resource.contentType)
      {
        // FIND CONTENT TYPE 
        // REPLACE FILE TYPE WITH CORRECT AND INSTANCIATE THAT
        this.resourceSource = new (Dawn.require(resource.url))();
      }
      
      if (this.resourceSource)
      {
        let instance = await this.resourceSource.in_instanciate(data); 
        instance.set_owner(this); // set as owner to inherit scope but do not become child
        if (resource.contentType == "application/dawn" || resource.contentType == "text/directory-json")
          await this.populate_children();
        if (this.get_resource().children)
          instance.get_resource().children = this.get_resource().children; // reference same children for back lookup 
        return instance;
      }
      
      return this;
    }

    // ── explicit operation ports: reads, listings and writes as values ──
    // The HTTP file routes are thin adapters; the filesystem semantics live
    // here so dawn usage stays simple. Paths arrive as Strings (bare paths
    // or file:/// URIs — this resource parses its own scheme); results leave
    // as typed values with the reference content-types stamped; errors leave
    // on out_error carrying an optional HTTP status for the reply.
    this.out_Data        = null;
    this.out_octetstream = null;
    this.out_String      = null;
    this.out_error       = null;
    // error plumbing: rejections from upstream hops flow through to the sink
    this.in_error = function(input)
    {
        return this.out_error?.(input);
    };

    function normalizeFilePath(p)
    {
        p = String(p || "");
        const q = p.indexOf("?");
        if (q !== -1) p = p.slice(0, q);
        if (p.indexOf("/") === 0) p = p.slice(1); // request-path form: /file:///C:/…
        if (p.indexOf("file:///") === 0) p = p.slice("file:///".length);
        else if (p.indexOf("file:/") === 0) p = p.slice("file:/".length);
        return p;
    }

    async function referenceMimeFor(mime, createReadStream, abs, extension)
    {
        if (extension === ".dawn") return "text/dawn";
        if (abs.endsWith(".dawn.js")) return "application/dawn";
        const defaultmimetype = await mime(extension);
        const mimeresult = (await mime(createReadStream(abs), defaultmimetype));
        if (mimeresult) return mimeresult.mime;
        return "file/" + extension.substring(1);
    }

    // the reference server's directory listing, verbatim (byte parity)
    async function referenceReadDir(_fs, _path, mime, createReadStream, dirpath, hidden)
    {
        let jsdir = {};
        let fdat = { contentType: "", size: 0, time: 0 };
        let files = _fs.readdirSync(dirpath);
        for (let fileno in files)
        {
            let file = files[fileno];
            let filepath = _path.resolve(dirpath, file);
            if (!/^\./.test(file) || hidden)
                try {
                    if (file.endsWith(".dawn")) // a .dawn file: documentation source AND executable loader entry
                    {
                        jsdir[file] = Object.assign({},fdat);
                        jsdir[file].contentType = "text/dawn";
                        file = file.replace(".dawn","");
                        if (typeof(jsdir[file]) == "undefined") // don't clobber a directory of the same name
                        {
                            jsdir[file] = Object.assign({},fdat);
                            jsdir[file].contentType = "application/dawn";
                        }
                    }
                    else
                    if (file.endsWith(".dawn.js")) // artifacts of .dawn sources — never shown in listings
                    {
                    }
                    else
                    {
                        var stat = _fs.statSync(filepath);
                        if (stat && stat.isDirectory()) { // directories always win the name (a module/doc with the same name coexists)
                            jsdir[file] = Object.assign({},fdat);
                            jsdir[file].contentType = "text/directory-json";
                            jsdir[file].size     = stat.size;
                            jsdir[file].time     = stat.mtimeMs;
                        }
                        else
                        {
                            jsdir[file] = Object.assign({},fdat);
                            let extension = _path.extname(filepath);
                            if (extension === "") // a file with no extension needs "." to be distinguised from dawn objects
                                file +=".";
                            let ftcontentType="text/uil";
                            if (extension !== ".uil")
                            {
                                ftcontentType = (await mime(createReadStream(filepath), extension)).mime;
                                if (!ftcontentType)
                                    ftcontentType = "binary/" + extension.replace(".","");
                            }
                            jsdir[file].contentType = ftcontentType;
                            jsdir[file].size     = stat.size;
                            jsdir[file].time     = stat.mtimeMs;
                        }
                    }
                } catch (e) {}
        }
        return jsdir;
    }

    this.in_String_read = async function(input)
    {
        if (!Dawn.isServer()) return;
        const raw = (input && input.get_resource) ? input.get_resource().value : ((input && input.value !== undefined) ? input.value : input);
        let hidden = null;
        const q = String(raw || "").indexOf("?");
        if (q !== -1) hidden = new URLSearchParams(String(raw).slice(q + 1)).get("hidden");
        const filepath = normalizeFilePath(raw);
        if (!filepath) return;
        const emit = (port, value, contentType) =>
        {
            const res = new (Dawn.require(port === "octetstream" ? "Content-Type/application/octetstream" : "Content-Type/data/Data"))();
            res.value = value;
            if (contentType) res.contentType = contentType;
            return this["out_" + port]?.(res.instanciate_processor());
        };
        try
        {
            const _fs = require("fs");
            const _path = require("path");
            const mime = require("mime-kind");
            const { createReadStream } = require("fs");
            const abs = _path.resolve(filepath);
            // a "directory" that only exists as a compiled module: empty listing
            if (_path.extname(filepath) === "" && !_fs.existsSync(abs) && _fs.existsSync(abs + ".dawn.js"))
            {
                emit("Data", {}, "text/directory-json");
                return;
            }
            const stats = _fs.statSync(abs);
            if (stats && stats.isDirectory())
            {
                emit("Data", await referenceReadDir(_fs, _path, mime, createReadStream, abs, hidden), "text/directory-json");
                return;
            }
            if (stats && stats.isFile())
            {
                const mimetype = await referenceMimeFor(mime, createReadStream, abs, _path.extname(abs));
                emit("octetstream", new Uint8Array(_fs.readFileSync(abs)), mimetype);
                return;
            }
            this.out_error?.({ value: { errno: 0, code: "UNKNOWN", syscall: "stat", path: abs } });
        }
        catch (exception)
        {
            this.out_error?.({ value: exception });
        }
    };

    this.in_Data_write = async function(input)
    {
        if (!Dawn.isServer()) return;
        const rec = (input && input.get_resource) ? input.get_resource().value : ((input && input.value !== undefined) ? input.value : input);
        if (!rec || !rec.path) return;
        try
        {
            const _fs = require("fs");
            const _path = require("path");
            const abs = _path.resolve(normalizeFilePath(rec.path));
            const bytes = rec.content ? (rec.content instanceof Uint8Array ? rec.content : new Uint8Array(rec.content)) : new Uint8Array(0);
            _fs.writeFileSync(abs, Buffer.from(bytes));
            const s = new (Dawn.require("Content-Type/data/String"))();
            s.value = "OK";
            this.out_String?.(s.instanciate_processor());
            // editing a .dawn source inside the repo - regenerate its .dawn.js artifact
            if (abs.endsWith(".dawn") && abs.startsWith(_path.resolve("dawn")))
            {
                try { require("child_process").execFileSync("node", ["build_sources.js"]); } catch (e) {}
            }
        }
        catch (e)
        {
            this.out_error?.({ value: e.message, status: 500 });
        }
    };
}
FileResource.Processor = FileResourceProcessor;
module.exports = FileResource;
if (Dawn.isServer()) { module.exports.read_dir = read_dir; } // directory-json listing for the fileserver