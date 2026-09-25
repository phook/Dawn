const Resource = Dawn.require("Content-Type/data/Resource");
const StringRes  = Dawn.require("Content-Type/data/String");
const NumberRes  = Dawn.require("Content-Type/data/Number");
const BooleanRes = Dawn.require("Content-Type/data/Boolean");
const DataRes    = Dawn.require("Content-Type/data/Data");
const OctetstreamRes    = Dawn.require("Content-Type/application/octetstream");

// Central content-type → resource casting, shared by the schemes that load
// external data (http:, https:, file:). The moment of cast is late: only when
// the content-type is actually known (after reading/fetching).
//
// cast(contentType, bytes, url) resolves which resource to instantiate through
// the dawn tree; first hit wins:
//   Content-Type.<type>.<subtype>   specialized mimetype resource in the tree
//   Content-Type.<type>             family main resource (e.g. Content-Type/image)
//   built-in defaults: text/* → data.String, image/svg+xml → data.String
//                      (markup text), application/json → data.Data,
//                      anything else → application.octetstream
// The found resource is fed the raw bytes through its blob interface
// (in_octetstream_$all) — every value resource knows how to parse its own bytes.
async function cast(contentType, bytes, url)
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
            return proc;
        }
    }
    return null;
}

// castValue(type, value) — the native-value sibling of cast(): wraps an
// already-typed JS value (string, BigRational, boolean, object, Uint8Array)
// in its own resource and returns a processor, ready for late-connect
// (connect + in_go). Used by the List operators, whose element types are
// known only at execution time — a list can mix any types, so no static
// out_<Type> port can be declared.
function castValue(type, value)
{
    let res = null;
    if (type === "String")  res = new StringRes();
    if (type === "Number")  res = new NumberRes();
    if (type === "Boolean") res = new BooleanRes();
    if (type === "Data")    res = new DataRes();
    if (type === "octetstream")    res = new OctetstreamRes();
    if (!res) return null;
    res.value = value;
    let proc = res.instanciate_processor();
    // populate the output list the way lookup_new does — connect() can only
    // offer plugs that are listed
    Object.keys(proc)
        .filter((output) => output.indexOf("out_") === 0 && output.indexOf("_$explicit") === -1)
        .forEach((output) => proc.outputList[output] = proc[output]);
    return proc;
}

// base64 helpers (Uint8Array ↔ base64), used by octetstream serialization in List
function u8ToBase64(u8)
{
    if (typeof Buffer !== "undefined") return Buffer.from(u8).toString("base64");
    let s = "";
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
}
function base64ToU8(b64)
{
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
    let s = atob(b64);
    let u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
}

module.exports = { cast, castValue, u8ToBase64, base64ToU8 };