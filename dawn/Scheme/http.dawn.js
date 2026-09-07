const Resource = Dawn.require("Content-Type/data/Resource");
const castLib  = Dawn.require("Scheme/cast");

// http:<host>/<path> — the URL itself is the resource. Triggering it (in_go)
// fetches the content; the resource then casts itself to the type implied by
// the response's content-type (String for text/*, Image for image/*, Data for
// JSON/other) and late-connects that cast value to the next resource in the
// flow. Type is discovered at load time — you can't know it before fetching.
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
        fetch(url)
          .then(async r => {
              if (!r.ok) { self?.out_error?.({ value: "http: status " + r.status + " for " + url }); return; }
              const contentType = r.headers.get("content-type") || "";
              const text = await r.text();
              let cast = await castLib.cast(contentType, text, url);
              if (cast && self.connectee)
              {
                  cast.connect(self.connectee);
                  cast.in_go?.();
              }
          })
          .catch(e => self?.out_error?.({ value: "http: fetch failed: " + e.message + " (" + url + ")" }));
    }
    this.in_instanciate = function(input)
    {
        // store the URL on a clone; instances differ only by URL
        let newObject = Object.assign({}, resource);
        newObject.url = input.value.split("?")[0];
        return newObject.instanciate_processor();
    }
}
http.Processor = HttpProcessor;
module.exports = http;