const Resource = Dawn.require("Content-Type/data/Resource");

// httpConnection.route — two modes, chosen by the URI tail:
//
// PATH GATE  httpConnection.route:<path>?method=GET
//   The identifier is the request path (a leading "/" is optional); the
//   optional ?method= parameter selects the HTTP method (default GET). On
//   match the gate fires out_go (no value — downstream starts exactly like
//   Boolean.if's go); on no-match it stays silent, leaving the connection to
//   answer itself the default at out_end. Host logic deliberately lives in a
//   separate guard element, not here (user decision 2026-10-15).
//
// VIA MOUNT  connection.route:<scheme>:<base>   (reached through a var
//   reference — that is what wires the per-request capture feed, see var's
//   subscription). The identifier is a URI prefix (e.g. file:public): the
//   captured connection's request path completes it (file:public + /x ->
//   file:public/x?read), the resource is loaded through the dawn tree and
//   the result streams out on out_response — the static-mount pattern
//   ("/" serves index.html, ".." answers 403, a miss stays silent so the
//   connection answers itself 204, GET/HEAD only). The scheme is free: any
//   loadable scheme (http: later) mounts the same way.
function route()
{
	Resource.call(this,"route");
	this.Processor = routeProcessor;
	return this;
}

function routeProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_go = null;
	this.out_response = null;

	// URI tail: <path>?method=GET (gate) or <scheme>:<base> (via mount)
	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		let tail = (input && input.value) || "";
		try { tail = decodeURIComponent(tail); } catch (e) {}
		let q = tail.indexOf("?");
		let head = (q == -1 ? tail : tail.slice(0, q));
		// a scheme-ish head ("file:public") selects the via mount; a path
		// ("environment.json") selects the gate
		if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(head))
		{
			newObject.viaURI = head;
			newObject.routePath = null;
			newObject.routeMethod = "GET";
		}
		else
		{
			newObject.viaURI = null;
			newObject.routePath = head;
			if (newObject.routePath.indexOf("/") == 0)
				newObject.routePath = newObject.routePath.slice(1);
			newObject.routeMethod = "GET";
			if (q != -1)
				for (const part of tail.slice(q + 1).split("&"))
				{
					const eq = part.indexOf("=");
					if (eq == -1) continue;
					if (decodeURIComponent(part.slice(0, eq)) == "method")
						newObject.routeMethod = decodeURIComponent(part.slice(eq + 1)).toUpperCase();
				}
		}
		return newObject.instanciate_processor();
	};

	this.in_httpConnection_$all = function(input)
	{
		{ const cr = (input && input.get_resource) ? input.get_resource() : input; }
		if (resource.viaURI) return this.via(input);
		return this.gate(input);
	};

	// gate mode: match method + path, fire out_go on match; the downstream
	// chain's promise (Dawn-promise continuation) is awaited so async work
	// (http fetches) completes before the request end event propagates
	this.gate = async function(input)
	{
		let meta = (input && input.get_resource) ? input.get_resource().value : (input && input.value);
		if (!meta) return;
		if (String(meta.method || "").toUpperCase() != resource.routeMethod) return;
		const urlPath = String(meta.url || "").split("?")[0];
		if (urlPath != "/" + resource.routePath) return;
		const r = this.out_go?.();
		if (r) { if (r.promise) await r.promise(); else await r; }
	};

	// via mount: complete the via URI with the request path, load through
	// the dawn tree, stream the result into the reply (out_response)
	this.via = async function(input)
	{
		let meta = (input && input.get_resource) ? input.get_resource().value : (input && input.value);
		if (!meta || typeof meta.url === "undefined") return;
		// static mounts answer reads only (express.static parity); anything
		// else falls through and the connection answers itself 204
		const method = String(meta.method || "GET").toUpperCase();
		if (method !== "GET" && method !== "HEAD") return;
		let p = String(meta.url).split("?")[0];
		try { p = decodeURIComponent(p); } catch (e) { return; }
		if (p === "/" || p === "") p = "/index.html";
		if (p.split("/").indexOf("..") !== -1)
		{
			this.out_response?.({ value: { __dawnResponse: { status: 403, contentType: "text/plain", body: "Forbidden" } } });
			return;
		}
		let inst = null;
		try { inst = await Dawn.instanciate_processor().lookup(resource.viaURI + p + "?read"); } catch (e) { inst = null; }
		if (!inst || !inst.connect) return;
		const replyFn = this.out_response;
		if (!replyFn) return;
		// relay: loaded values flow into the reply; lifecycle (begin/end)
		// and the error channel stay unbound - a begin must never answer the
		// connection, and a miss answers 204
		const relay = { offer_connection: function(match) {
			if (match === "error" || match === "begin" || match === "end") return null;
			return replyFn;
		} };
		try { inst.connect(relay); } catch (e) { return; }
		inst.in_begin?.();
		try
		{
			const r = inst.in_go?.();
			if (r) { if (r.promise) await r.promise(); else await r; }
		} catch (e) {}
		inst.in_end?.();
	};
	return this;
}
route.Processor = routeProcessor;
module.exports = route;
