// httpServer:port — a low-level HTTP listener resource (the Express-minimal
// primitive an express: scheme can later be layered on top of).
//
// Per accepted request it fires, in order:
//   out_request_headers   — { method, url, headers } as Data, always if bound
//   out_request_<Type>    — the request body cast through the Content-Type
//                           tree (out_request_octetstream is the fallback)
// The handler chain's return value becomes the response: cast back through
// the tree (String/Number/Boolean → text/plain, Data/List → application/json,
// octetstream → application/octetstream). undefined means 204 (empty).
// If nothing is bound for the request at all, the answer is 404.
const Resource = Dawn.require("Content-Type/data/Resource");
const http = require("node:http");
const castLib  = Dawn.require("Scheme/cast");
const StringRes = Dawn.require("Content-Type/data/String");

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

	this.out_request_headers    = null;
	this.out_request_octetstream = null;
	this.out_request_String     = null;
	this.out_request_Data       = null;

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
			           	console.log("httpServer handler error: " + (err && err.message));
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
		const value = await castLib.cast(contentType, body, req.url);

		const self = this;
		let reply;
		// 1. headers port fires first — routing sees method/url before the body
		if (self.out_request_headers)
			reply = await self.out_request_headers(meta);
		// 2. typed body port — out_request_octetstream is the fallback (cast
		//    guarantees an octetstream when nothing more specific exists)
		if (value)
		{
			const bodyPort = self["out_request_" + value.get_resource().name];
			if (bodyPort)
			{
				const bodyReply = await bodyPort(value);
				if (bodyReply !== undefined) reply = bodyReply;
			}
		}
		if (reply === undefined && !self.out_request_headers && !value)
			return respond(res, undefined, 404);

		respond(res, reply, undefined);
	};

	// anything the handler chain returned → response on the wire
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
		res.end(body);
	}
	return this;
}
httpServer.Processor = httpServerProcessor;
module.exports = httpServer;