const Resource = Dawn.require("Content-Type/data/Resource");

// http:<host>/<path> — the URL itself is the resource. Triggering it (in_go)
// fetches the content as bytes; the resource found for the response's
// content-type in the Content-Type tree parses them through its blob
// interface and late-connects to the next resource in the flow. Type is
// discovered at load time — you can't know it before fetching.
function http()
{
    Resource.call(this,"http");
    this.Processor = HttpProcessor;
    this.protocol = "http:";
    return this;
}

function HttpProcessor(resource)
{
    if (resource.init) resource.init.call(this, resource);
    Resource.Processor.call(this, resource);
    this.in_go = function()
    {
        const self = this;
        const proto = resource.protocol || "http:";
        const url = proto + "//" + resource.url;
        // Dawn-promise continuation: the caller (flow executor or an
        // awaiting port call) resumes when the fetch + cast + reply is done
        const p = new Dawn.Promise();
        p.promise(); // install resolve/reject before the async work
        fetch(url)
          .then(async r => {
              if (!r.ok) { self?.out_error?.({ value: "http: status " + r.status + " for " + url }); p.resolve(); return; }
              const contentType = r.headers.get("content-type") || "";
              const bytes = new Uint8Array(await r.arrayBuffer());
              let cast = await Dawn.cast(contentType, bytes, url);
              if (cast && self.connectee)
              {
                  cast.connect(self.connectee);
                  cast.in_begin?.();
                  cast.in_go?.();
                  cast.in_end?.();
              }
              p.resolve();
          })
          .catch(e => { self?.out_error?.({ value: "http: fetch failed: " + e.message + " (" + url + ")" }); p.resolve(); });
        return p;
    }
    this.in_instanciate = function(input)
    {
        // store the URL on a clone; instances differ only by URL
        let newObject = Object.assign({}, resource);
        newObject.url = input.value.split("?")[0].replace(/^\/\//, ""); // accepts host/path and //host/path
        return newObject.instanciate_processor();
    }
}
http.Processor = HttpProcessor;
module.exports = http;