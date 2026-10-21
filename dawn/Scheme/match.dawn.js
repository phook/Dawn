const Resource = Dawn.require("Content-Type/data/Resource");

// match:?field=value&field2=a,b  — AND of field equalities, OR within a field,
// dotted field paths, |normalizer suffix on the field name.
// Emits out_Boolean per incoming value and threads returns (reply chains).
function match()
{
	Resource.call(this,"match");
	this.Processor = matchProcessor;
	return this;
}

const normalizers =
{
	portless: function(v)
	{
		return String(v).replace(/\[|\]/g,"").replace(/:\d+$/,"");
	}
};

function matchProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_Boolean = null;

	function dig(value, path)
	{
		if (value && value.get_resource) value = value.get_resource().value;
		if (!path) return value;
		for (const key of path.split("."))
		{
			if (value == null) return undefined;
			value = value[key];
		}
		return value;
	}

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		// input.value is the raw URI tail, e.g. "?method=GET&headers.host|portless=localhost;127.0.0.1"
		let tail = (input && input.value || "").replace(/^\?/,"");
		newObject.tests = tail.split("&").filter(v => v!=="").map(function(part)
		{
			const eq = part.indexOf("=");
			let field = decodeURIComponent(part.slice(0, eq));
			const values = decodeURIComponent(part.slice(eq+1)).split(",");
			let normalizer = null;
			const pipe = field.indexOf("|");
			if (pipe !== -1)
			{
				normalizer = normalizers[field.slice(pipe+1)] || null;
				field = field.slice(0, pipe);
			}
			return { field: field, values: values, normalizer: normalizer };
		});
		return newObject.instanciate_processor();
	};

	this.test = function(input)
	{
		let ok = true;
		const tests = this.get_resource().tests || [];
		for (const t of tests)
		{
			let v = dig(input !== undefined && input.value !== undefined ? input.value : input, t.field);
			if (v && v.get_resource) v = v.get_resource().value;
			// host fields always compare by name: the port is not part of a host
			if (t.normalizer) v = t.normalizer(v);
			else if (t.field === "host" || t.field.endsWith(".host")) v = normalizers.portless(v);
			if (!t.values.includes(String(v))) { ok = false; break; }
		}
		return this.out_Boolean?.({ value: ok });
	};
	// typed catchalls = the binding surface (in_<Type>_$all matching convention)
	const self = this;
	this.in_String_$all          = function(input) { self.test(input); };
	this.in_Data_$all            = function(input) { self.test(input); };
	this.in_Number_$all          = function(input) { self.test(input); };
	this.in_Boolean_$all         = function(input) { self.test(input); };
	this.in_octetstream_$all     = function(input) { self.test(input); };
	// request meta ({method,url,headers}) arrives on httpServer's out_request_headers
	this.in_request_headers_$all = function(input) { self.test(input); };
	// or as an httpConnection value on out_httpConnection (meta on its .value)
	this.in_httpConnection_$all = function(input) { return self.test(input); };
	return this;
}
match.Processor=matchProcessor;
module.exports=match;