const Resource  = Dawn.require("Content-Type/data/Resource");

// Content-Type/application/json — parsed JSON data from bytes (Content-Type
// role) AND named records with field-addressable I/O (nesting role, file:-like).
// Records live in a module-level registry keyed by name, so all references
// in a flow write/read the same object. Sink side = bind override (any
// offered out_<Type>_<field> becomes a writer); source side = file-style
// nested addressing (json:name.field.subfield as a flow head emits that value).
const records = {};
const VALUE_TYPES = ["String","Number","Boolean","Data","octetstream"];
function json()
{
	Resource.call(this,"json");
	this.Processor = jsonProcessor;
	return this;
}

function jsonProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_Data = null;
	this.out_String = null;

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		// URI tail: "" (Content-Type use), "name" (record) or "name.field.sub" (field)
		const tail = ((input && input.value) || "").split("?")[0].split("#")[0];
		const dot = tail.indexOf(".");
		newObject.recordName = decodeURIComponent(dot === -1 ? tail : tail.slice(0, dot));
		newObject.fieldPath  = dot === -1 ? null : decodeURIComponent(tail.slice(dot+1)).split(".");
		if (newObject.recordName && !records[newObject.recordName]) records[newObject.recordName] = {};
		return newObject.instanciate_processor();
	};

	// bare json: = anonymous per-request record on this processor instance;
	// json:name = the named process-global record
	let instanceRecord = {};
	function currentRecord()
	{
		return resource.recordName ? records[resource.recordName] : instanceRecord;
	}

	function dig()
	{
		let v = currentRecord();
		if (resource.fieldPath)
			for (const k of resource.fieldPath) { if (v == null) return undefined; v = v[k]; }
		return v;
	}

	function setField(path, value)
	{
		let obj = currentRecord();
		for (let i = 0; i < path.length - 1; i++)
		{
			if (typeof obj[path[i]] !== "object" || obj[path[i]] === null) obj[path[i]] = {};
			obj = obj[path[i]];
		}
		obj[path[path.length - 1]] = value;
	}

	// the record as an httpServer verbatim reply payload (streamed on out_response)
	function replyPayload()
	{
		return { __dawnResponse: { status: 200, contentType: "text/json", body: JSON.stringify(currentRecord()) } };
	}

	// bind override: any offered out_<Type>_<field> becomes a writer for <field>
	// (dots nest deeper). Writes only set fields - no return values in Dawn; the
	// sealed record streams out on out_response at end of input.
	const baseOffer = this.offer_connection.bind(this);
	this.offer_connection = function(match)
	{
		const ux = match.indexOf("_");
		if (ux !== -1 && VALUE_TYPES.includes(match.slice(0, ux)))
		{
			const path = (resource.fieldPath ? resource.fieldPath.join(".") + "." : "") + match.slice(ux + 1);
			return function(input)
			{
				let v = input && input.value !== undefined ? input.value : input;
				if (v && v.get_resource) v = v.get_resource().value;
				setField(path.split("."), v);
				dirty = true;
			};
		}
		return baseOffer(match);
	};

	let dirty = false;
	this.out_response = null;
	this.in_begin = function()
	{
		dirty = false;
		if (!resource.recordName) instanceRecord = {}; // anonymous records are per-request
		this.out_begin?.();
	};
	this.in_end = function()
	{
		if (dirty && this.out_response)
			this.out_response({ value: replyPayload() });
		this.out_end?.();
	};

	// Content-Type role: parse bytes into the value
	this.in_octetstream_$all = function(input)
    {
		let u8 = input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value);
		let text = new TextDecoder().decode(u8);
		try { resource.value = JSON.parse(text); }
		catch (e) { resource.value = text; }
		// a named record loaded from bytes becomes the record's content
		if (resource.recordName && typeof resource.value === "object") records[resource.recordName] = resource.value;
    }

	// go: field instances emit the addressed value; plain instances emit the
	// parsed Data (Content-Type role).
	this.in_go = function()
    {
		if (resource.fieldPath)
		{
			const v = dig();
			if (typeof v === "string") return this.out_String?.({ value: v });
			if (v !== undefined) return this.out_Data?.({ value: v });
			return undefined;
		}
		return this.out_Data?.(resource);
    }
	return this;
}
json.Processor=jsonProcessor;
module.exports=json;