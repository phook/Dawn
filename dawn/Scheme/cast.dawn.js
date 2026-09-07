const Resource = Dawn.require("Content-Type/data/Resource");

// Central content-type → resource casting, shared by the schemes that load
// external data (http:, https:, file:). The moment of cast is late: only when
// the content-type is actually known (after reading/fetching).
//
// cast(contentType, text, url) -> a processor of the right resource type
// holding the value. Casting rules are deliberately simple and documented here:
//   text/*            → String (text)
//   text/dawn         → String (the source; the dawn: meta resource executes it)
//   application/json  → Data   (parsed object, or text fallback)
//   image/*           → Data   (raw) — until an `image` content-type exists at
//                        Content-Type/image (lowercase, mimetype-convention;
//                        subtypes live in that folder, the main resource beside it)
//   anything else     → Data   (raw text; binary via ? is future)
//
// Then connectValue(connectorProcessor, castProc) performs the late connect:
// the cast resource's out_<Type> binds to whatever downstream accepted — at the
// moment the type is actually known, per the late-connect design (see
// docs/output-interfaces.md).
// Then connectValue(connectorProcessor, castProc) performs the late connect:
// the cast resource's out_<Type> binds to whatever downstream accepted — at the
// moment the type is actually known, per the late-connect design (see
// docs/output-interfaces.md).
async function cast(contentType, text, url)
{
    contentType = (contentType || "").split(";")[0].trim();
    const root = Dawn.instanciate_processor();
    let uri;
    if (contentType.indexOf("text/") === 0)
        uri = "String:" + encodeURIComponent(text);
    else
    if (contentType === "application/json")
    {
        let parsed;
        try { parsed = JSON.parse(text); } catch (e) { parsed = text; }
        let dataProc = await root.lookup("Data:");
        if (dataProc)
        {
            dataProc.get_resource().value = parsed;
            return dataProc;
        }
        uri = "String:" + encodeURIComponent(text);
    }
    else
    if (contentType.indexOf("image/") === 0)
    {
        // future: Content-Type/image — for now raw text payload
        let dataProc = await root.lookup("Data:");
        if (dataProc)
        {
            dataProc.get_resource().value = text;
            return dataProc;
        }
        uri = "String:" + encodeURIComponent(text);
    }
    else
    {
        let dataProc = await root.lookup("Data:");
        if (dataProc)
        {
            dataProc.get_resource().value = text;
            return dataProc;
        }
        uri = "String:" + encodeURIComponent(text);
    }
    return await root.lookup(uri);
}

module.exports = { cast };