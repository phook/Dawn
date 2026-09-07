const http = Dawn.require("Scheme/http");

// https: — the http: resource with the secure protocol.
function https()
{
    let r = new http();
    r.protocol = "https:";
    return r;
}
module.exports = https;