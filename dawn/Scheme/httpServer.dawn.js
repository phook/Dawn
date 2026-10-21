const Resource      = Dawn.require("Content-Type/data/Resource");
const ConnectionRes = Dawn.require("Scheme/httpConnection");
const http          = require("node:http");

// httpServer:port — an HTTP acceptor. Per request: build an httpConnection
// (creation wires the req/res pair and the request meta into it — see
// httpConnection:), then begin → connection → headers → typed body → end over
// the outputs. Dawn has no return values: the reply STREAMS into the
// connection, which writes its own res; a silent handler is answered the
// connection's default when the end event reaches it through the flow. The
// canonical handler names the connection with var: and dispatches through
// the var's subscription broadcast, with the handler body a list:
//   httpServer:0#|httpConnection>>[var:httpConnection:con … >>con:]
// Requests are serialized. Without a bound connection the acceptor answers
// itself (204 when other request ports fired, 404 when nothing was routed).
function httpServer()
{
	Resource.call(this,"httpServer");
	this.Processor = httpServerProcessor;
	return this;
}

function httpServerProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;

	let server = null;
	let started = false;
	// serialize request handling: flows run one at a time, in accept order
	let tail = Promise.resolve();

	this.out_httpConnection     = null;
	this.out_request_headers    = null;
	this.out_request_octetstream = null;
	this.out_request_String     = null;
	this.out_request_Data       = null;

	// the acceptor drives the request lifecycle itself, per request, out over
	// its bound outputs; the program's own start/stop must not leak into it
	this.in_begin = function() {};
	this.in_end   = function() {};

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		newObject.port = parseInt(decodeURIComponent(input.value || "")) || 0; // 0 = ephemeral
		return newObject.instanciate_processor();
	};

	this.in_go = function()
	{
		if (started) return;
		started = true;
		const self = this;
		server = http.createServer(function(req, res) {
			tail = tail.then(function() { return self.handle(req, res); })
			           .catch(function(err) {
			           	console.log("httpServer handler error: " + (err && err.stack || err));
			           	if (!res.headersSent) { res.statusCode = 500; }
			           	res.end("httpServer: 500 internal error");
			           });
		});
		server.listen(resource.port, function() {
			console.log("httpServer listening on port " + (server.address() ? server.address().port : resource.port));
		});
	};

	this.handle = async function(req, res)
	{
		const chunks = [];
		req.on("data", c => chunks.push(c));
		await new Promise(function(done) { req.on("end", done); });
		const body = Buffer.concat(chunks);

		const meta = { method: req.method, url: req.url, headers: req.headers };
		const contentType = (req.headers["content-type"] || "").split(";")[0];
		const value = await Dawn.cast(contentType, body, req.url);

		const self = this;
		// no connection bound: the acceptor answers itself before any connection
		// exists (204 when other request ports fired or a body was cast, 404
		// when nothing at all was routed)
		if (!self.out_httpConnection)
		{
			if (self.out_begin) await self.out_begin();
			if (self.out_request_headers) await self.out_request_headers(meta);
			if (value)
			{
				const bodyPort = self["out_request_" + value.get_resource().name];
				if (bodyPort) await bodyPort(value);
			}
			if (self.out_end) await self.out_end();
			respond(res, undefined, (self.out_request_headers || value) ? 204 : 404);
			return;
		}

		// the connection holds the req/res pair from this handle and runs the
		// reply session: in_go presents the request to the pipe, in_response_$all
		// replies to res, in_end answers the default when the handler stayed
		// silent (grace window for async repliers)
		const conRes = new ConnectionRes();
		conRes.value = meta;
		conRes.req   = req;
		conRes.res   = res;
		conRes.defaultStatus = 204;
		conRes.body  = new Uint8Array(body); // the raw request bytes, for handlers that need them (PUT /_file)
		const con = conRes.instanciate_processor();

		// request lifecycle outward: begin → connection → headers → body → end;
		// accumulating handlers seal at end and stream the reply into the
		// connection (by way of the handler's var reference)
		if (self.out_begin) await self.out_begin();
		await self.out_httpConnection(con);
		if (self.out_request_headers) await self.out_request_headers(meta);
		if (value)
		{
			const bodyPort = self["out_request_" + value.get_resource().name];
			if (bodyPort) await bodyPort(value);
		}
		if (self.out_end) await self.out_end();
	};
	return this;
}

// anything streamed into the connection's reply port → response on the wire
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
	res.end(body);
}
const CSP_HEADER = "default-src * 'unsafe-eval' 'unsafe-inline' data: blob:; script-src * 'unsafe-eval' 'unsafe-inline'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data: blob:;";
httpServer.Processor = httpServerProcessor;
module.exports = httpServer;
