const Resource = Dawn.require("Content-Type/data/Resource");

// httpConnection: — one accepted HTTP request as a resource. It holds the
// req/res pair from the acceptor's handle (the connection's own edge, the
// way file: holds its path) plus the request meta on .value.
//   in_go             - presents the request to the pipe: emits the request
//                       meta on out_request_headers (the connection starts
//                       the processing pipe when it is triggered)
//   in_response_$all  - replies to res: the payload streams in, the
//                       connection writes the wire
//   in_end            - request end reached the connection through the
//                       flow: a handler that stayed silent is answered the
//                       default (204 routed-but-silent) after a short grace
//                       window, so async repliers (the via mount's file
//                       load) land first
// {__dawnResponse:{status,contentType,headers,body}} is sent verbatim.
function httpConnection()
{
	Resource.call(this,"httpConnection");
	this.Processor = httpConnectionProcessor;
	return this;
}

function httpConnectionProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	resource.answered = false;

	// future: body ports fire on late-connect (when the handler binds them)
	this.out_request_octetstream = null;
	this.out_request_String     = null;
	this.out_request_Data       = null;

	// .go — present the request to the pipe
	this.out_request_headers = null;
	this.in_go = function()
	{
		if (resource.value) this.out_request_headers?.({ value: resource.value });
	};

	// the reply: streams in, the connection writes its own res
	this.in_response_$all = function(input)
	{
		if (resource.answered || !resource.res) return;
		resource.answered = true;
		respond(resource.res, (input && input.get_resource) ? input : ((input && input.value !== undefined) ? input.value : input), 200);
	};

	// request end through the flow: default-answer silent handlers
	this.in_end = function()
	{
		if (resource.answered || !resource.res) return;
		setTimeout(function()
		{
			if (resource.answered || !resource.res) return;
			resource.answered = true;
			respond(resource.res, undefined, resource.defaultStatus || 204);
		}, 100);
	};

	// the reply arrives on ANY value port - the connection is the reply sink
	// for every type (a fetched image lands as octetstream, fetched text as
	// String, json as Data, ...); all of them reply to res
	this.in_String_$all = this.in_response_$all;
	this.in_Number_$all = this.in_response_$all;
	// the Boolean reply is the SUCCESS pattern (e.g. file:'s out_Boolean_success):
	// the http layer translates it - true -> 200 "OK", false -> 500 "false"
	this.in_Boolean_$all = function(input)
	{
		if (resource.answered || !resource.res) return;
		resource.answered = true;
		const v = (input && input.get_resource) ? input.get_resource().value : ((input && input.value !== undefined) ? input.value : input);
		if (v) send(resource.res, 200, "text/plain", "OK");
		else send(resource.res, 500, "text/plain", "false");
	};
	this.in_Data_$all = this.in_response_$all;
	this.in_octetstream_$all = this.in_response_$all;
	// an error arriving at the connection replies the wire: strings are plain
	// messages (their status or 404), objects are JSON errors (404 unless a
	// status rides along) - the reference server's file-route behavior
	this.in_error = function(input)
	{
		if (resource.answered || !resource.res) return;
		resource.answered = true;
		const v = (input && input.value !== undefined) ? input.value : input;
		const status = (input && input.status) || 404;
		const isMsg = typeof v === "string";
		send(resource.res, status, isMsg ? "text/plain" : "application/json", isMsg ? v : JSON.stringify(v));
	};
	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		return newObject.instanciate_processor();
	};
	return this;
}

// reply writing: typed resources by name/contentType, {value:...} wrappers
// unwrapped, {__dawnResponse:{status,contentType,headers,body}} verbatim
function respond(res, reply, status)
{
	if (reply === undefined || reply === null)
	{
		res.statusCode = status || 204;
		res.end();
		return;
	}
	if (reply.get_resource) // a resource: cast by its type name
	{
		const r = reply.get_resource();
		const v = r.value;
		if (r.contentType) // the true content-type wins (cast stamps it on loaded values)
		{
			if (v instanceof Uint8Array)
				return send(res, status||200, r.contentType, Buffer.from(v));
			if (r.name === "Data" || r.name === "List")
				return send(res, status||200, r.contentType, JSON.stringify(v !== undefined ? v : (r.elements || [])));
			return send(res, status||200, r.contentType, String(v));
		}
		if (r.name === "String" || r.name === "Number" || r.name === "Boolean")
			return send(res, status||200, "text/plain", String(v));
		if (r.name === "Data" || r.name === "List")
			return send(res, status||200, "application/json", JSON.stringify(v !== undefined ? v : (r.elements || [])));
		if (r.name === "octetstream")
			return send(res, status||200, "application/octet-stream", Buffer.from(v instanceof Uint8Array ? v : new Uint8Array(0)));
		return send(res, status||200, "text/plain", String(v));
	}
	switch (typeof reply)
	{
		case "string":  return send(res, status||200, "text/plain", reply);
		case "number":
		case "boolean": return send(res, status||200, "text/plain", String(reply));
		case "object":
			// verbatim escape hatch: {__dawnResponse:{status,contentType,headers,body}}
			if (reply && reply.__dawnResponse)
			{
				const r = reply.__dawnResponse;
				if (r.headers) for (const k of Object.keys(r.headers)) res.setHeader(k, r.headers[k]);
				const body = r.body === undefined ? "" : (r.body instanceof Uint8Array ? Buffer.from(r.body) : String(r.body));
				return send(res, r.status || 200, r.contentType || "text/plain", body);
			}
			if (reply instanceof Uint8Array)
				return send(res, status||200, "application/octet-stream", Buffer.from(reply));
			return send(res, status||200, "application/json", JSON.stringify(reply));
	}
	return send(res, status||204, "text/plain", "");
}
function send(res, status, contentType, body)
{
	res.statusCode = status;
	res.setHeader("content-type", contentType);
	res.setHeader("Content-Security-Policy", CSP_HEADER);
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.end(body);
}
const CSP_HEADER = "default-src * 'unsafe-eval' 'unsafe-inline' data: blob:; script-src * 'unsafe-eval' 'unsafe-inline'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data: blob:;";
httpConnection.Processor=httpConnectionProcessor;
module.exports = httpConnection;
