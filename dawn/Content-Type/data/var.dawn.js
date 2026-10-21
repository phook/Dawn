const Resource = Dawn.require("Content-Type/data/Resource");

// var:<Type>:<name>  looks up <Type> as a new object, instantiates it under
// <name>, and introduces <name>: into the script's scope (the top-level
// program container the declaration lives in), so later lines and later
// elements in the same flow can reference it.
//
// At run time the declaration captures each value that flows through and
// forwards it downstream. A reference <name>: works in both directions:
//   sink   - ...>><name>:    routes each incoming call into the currently
//                            captured value's matching in_* port (the
//                            httpConnection reply pattern)
//   source - <name>:>>...    on go, replays the captured value downstream
// A QUALIFIED reference (<name>:<tail>, e.g. connection:file:public) is a
// live subscription with a VIA: it registers with the declaring element and
// on every capture the pump completes the tail URI with the captured
// request's path (file:public + /x -> file:public/x?read), loads it through
// the dawn tree and streams the result into the connection's response —
// the static-mount pattern ("/" serves index.html, ".." answers 403, a miss
// stays silent so the connection answers itself the default). Values
// without a request url make the pump a no-op.
// A SUB-PATH through the reference (<name>.<child>:<tail>, e.g.
// connection.route:file:public) resolves the child resource normally and
// wraps it in a subscription proxy: each captured value is fed into the
// resolved instance by its type (in_<Type>_$all) — that is how the
// httpConnection.route gate/via receives each request. See
// httpConnection.route for the via semantics.
// The capture awaits the downstream chain (Dawn-promise continuation, the
// execute/execute_fn pattern), so async work (file loads, http fetches)
// completes before the request end event propagates.
function _var()
{
	Resource.call(this,"var");
	this.Processor = varProcessor;
	return this;
}

// Processor for a REFERENCE to a var-introduced name (<name>:). The
// introduced resource lives in the scope's children; instantiating it yields
// this per-reference delegate bound to the declaring element.
function varReferenceProcessor(resource)
{
	Resource.Processor.call(this, resource);
	// pre-declare the typed output so connecting as a source wires it up
	if (resource.varType)
		this["out_" + resource.varType] = null;
	this.out_begin = null;
	this.out_end   = null;

	// sub-paths through the reference (connection.route:...): resolve the
	// child normally, then wrap it in a subscription proxy — the capture
	// broadcast feeds the resolved instance with each captured value
	this.previousLookup = this.lookup_new;
	this.lookup_new = async function(identifier, searchToRoot)
	{
		const result = await this.previousLookup(identifier, searchToRoot);
		if (result && typeof identifier === "string" && identifier.indexOf(resource.name + ".") === 0)
		{
			const owner = this;
			const proxy = {
				isVarSubscription: true,
				target: result,
				get_resource: function() { return result.get_resource ? result.get_resource() : resource; },
				instanciate_processor: function() { return this; },
				default_processor: function() { return this; },
				set_owner: function() {},
				get_output_types: function()
				{
					if (this.target && this.target.get_output_types)
						return this.target.get_output_types();
					return new Set();
				},
				connect: function(next) { if (this.target) this.target.connect(next); return next; },
				offer_connection: function(match)
				{
					if (this.target && this.target.offer_connection)
						return this.target.offer_connection(match);
					return undefined;
				},
				in_begin: function() { this.target?.in_begin?.(); },
				in_end:   function() { this.target?.in_end?.(); },
				in_go:    function() {}, // capture-driven, never program-start go
				// per capture: feed the captured value into the target by type;
				// the result (an async chain's promise) propagates to the caller
				onCapture: function()
				{
					const c = owner.captured();
					if (!c || !this.target) return;
					const typeName = c.get_resource ? c.get_resource().name : null;
					if (!typeName) return;
					const fn = this.target["in_" + typeName + "_$all"] || this.target["in_" + typeName];
					if (fn) return fn.call(this.target, c);
				}
			};
			resource.subscribers = resource.subscribers || [];
			if (resource.subscribers.indexOf(proxy) === -1)
				resource.subscribers.push(proxy);
			return proxy;
		}
		return result;
	};

	this.in_instanciate = function(input)
	{
		// delegate object: runtime indirection to the declaring element's
		// currently captured value (the captured value is replaced per event)
		const self = this;
		const outType = resource.varType ? "out_" + resource.varType : null;
		let uriTail = (input && input.value) || "";
		try { uriTail = decodeURIComponent(uriTail); } catch (e) {}
		return {
			isVarReference: true,
			uriTail: uriTail,
			get_resource: function() { return resource; },
			instanciate_processor: function() { return this; },
			default_processor: function() { return this; },
			set_owner: function() {},
			inputList: {},
			outputList: {},
			endParameters: {},
			build_output_types: function() {},
			get_output_types: function() { return resource.varType ? new Set([resource.varType]) : new Set(); },
			// source direction: wire our typed output + lifecycle into next
			connect: function(next)
			{
				this.connectee = next;
				if (outType)
				{
					let bound = next.offer_connection(resource.varType);
					if (bound) this[outType] = bound;
				}
				let b = next.offer_connection("begin"); if (b) this.out_begin = b;
				let e = next.offer_connection("end");   if (e) this.out_end   = e;
				// qualified references subscribe: via pump per captured value,
				// plus the reply route (the connection's response wire)
				if (this.uriTail)
				{
					let r = next.offer_connection("response");
					if (r) this.reply = r;
					resource.subscribers = resource.subscribers || [];
					if (resource.subscribers.indexOf(this) === -1)
						resource.subscribers.push(this);
				}
				return next;
			},
			// sink direction: route each incoming call into the captured
			// value's matching in_* port. An upstream go / go_then signal
			// (e.g. Boolean.if's then branch) STARTS this source: the captured
			// value replays downstream - that is how an if sentence in the
			// list hands the connection to the rest of its chain.
			offer_connection: function(match)
			{
				if (match === "begin" || match === "end")
				{
					// lifecycle passes THROUGH the reference: the captured value
					// sees the event AND the chain continues downstream
					const d = this;
					return function(input)
					{
						const c = self.captured();
						if (c && c["in_" + match]) c["in_" + match].call(c, input);
						return d["out_" + match]?.(input);
					};
				}
				if (match === "go" || match === "go_then")
				{
					const d = this;
					return function(input)
					{
						const c = self.captured();
						if (!c || !outType || !d[outType]) return;
						// pass the capture raw - identical to the declaration's own
						// out: downstream digs get_resource().value / .body
						return d[outType](c);
					};
				}
				return function(input)
				{
					const c = self.captured();
					if (!c) return;
					const fn = c["in_" + match + "_$all"] || c["in_" + match];
					if (fn) return fn.call(c, input);
				};
			},
			in_begin: function()
			{
				const c = self.captured();
				if (c && c.in_begin) c.in_begin();
				this.out_begin?.();
			},
			in_end: function()
			{
				const c = self.captured();
				if (c && c.in_end) c.in_end();
				this.out_end?.();
			},
			in_go: function()
			{
				const c = self.captured();
				if (c && c.in_go) c.in_go(); // late-Bound processors (e.g. connections)
				// replay the captured value downstream when used as a source
				// (qualified references are capture-driven subscriptions instead)
				if (!this.uriTail && c && outType && this[outType])
					return this[outType](c);
			},
			// per-capture hook for qualified references: the via pump. The
			// tail is a URI prefix that the captured request's path
			// completes; the resolved resource is loaded and streamed into
			// the reply route. Values without a request url no-op.
			onCapture: async function()
			{
				const c = self.captured();
				if (!c || !this.uriTail) return;
				// URI-form tail (scheme:base) = via pump; plain marker tail =
				// replay the captured value downstream (the subscription fires)
				if (this.uriTail.indexOf(":") === -1)
				{
					if (outType && this[outType])
						return this[outType](c);
					return;
				}
				if (!this.reply) return;
				const res = c.get_resource ? c.get_resource() : c;
				const meta = res && res.value;
				if (!meta || typeof meta.url === "undefined") return;
				const method = String(meta.method || "GET").toUpperCase();
				if (method !== "GET" && method !== "HEAD") return;
				let path = String(meta.url).split("?")[0];
				try { path = decodeURIComponent(path); } catch (e) { return; }
				if (path === "/" || path === "") path = "/index.html";
				if (path.split("/").indexOf("..") !== -1)
				{
					this.reply({ value: { __dawnResponse: { status: 403, contentType: "text/plain", body: "Forbidden" } } });
					return;
				}
				let inst = null;
				try { inst = await Dawn.instanciate_processor().lookup(this.uriTail + path + "?read"); } catch (e) { inst = null; }
				if (!inst || !inst.connect) return;
				const replyFn = this.reply;
				// relay: loaded values flow into the reply route; lifecycle
				// (begin/end) and the error channel stay unbound — a begin
				// must never answer the connection, and a miss answers the
				// connection's default
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
			}
		};
	};

	this.captured = function()
	{
		const element = resource.varElement;
		return element ? element.captured : undefined;
	};

	return this;
}

function varProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;

	// ports are typed by the declaration: in_<Type>_$all captures, out_<Type> forwards
	if (resource.varType)
	{
		const self = this;
		this["in_" + resource.varType + "_$all"] = async function(input)
		{
			self.captured = input && input.get_resource ? input : (input && input.value !== undefined ? input.value : input);
			// forward downstream; an async chain reports a promise - await it
			// (Dawn-promise continuation, the execute/execute_fn pattern) so
			// the request end event only propagates after the work is done
			const r = self["out_" + resource.varType]?.(self.captured);
			if (r) { if (r.promise) await r.promise(); else await r; }
			// qualified references and sub-path proxies subscribed to this
			// declaration: per-capture hooks, awaited the same way
			const intro = resource.introduced;
			if (intro && intro.subscribers)
				for (const s of intro.subscribers)
					if (s && s.onCapture)
					{
						const sr = s.onCapture();
						if (sr) { if (sr.promise) await sr.promise(); else await sr; }
					}
		};
		this["out_" + resource.varType] = null;
	}

	// called by the Flow/List varName hook, from the scope the flow lives in,
	// so the type lookup runs in the correct naming context
	this.introduceVar = async function()
	{
		if (resource.introduced || !resource.varType)
			return;
		// look the type up as a new object and instantiate it under the name
		const typeProcessor = await this.lookup(resource.varType + ":");
		const typeResource  = typeProcessor && typeProcessor.get_resource && typeProcessor.get_resource();
		if (!typeResource)
			return;
		const introduced = Object.assign({}, typeResource);
		introduced.varType   = resource.varType;
		introduced.varName   = resource.varName;
		introduced.name      = resource.varName;
		introduced.Processor = varReferenceProcessor;
		delete introduced.default_processor_instance;
		resource.introduced = introduced;
	};

	this.in_instanciate = function(input)
	{
		const tail = decodeURIComponent((input && input.value) || "");
		if (tail.indexOf(":") !== -1)
		{
			// declaration: var:Type:name
			const ci = tail.indexOf(":");
			let newObject = this.get_resource().clone();
			newObject.varType = tail.slice(0, ci);
			newObject.varName = tail.slice(ci + 1);
			newObject.name    = newObject.varName; // so "name:" lookup prefix-matches
			return newObject.instanciate_processor();
		}
		// bare var: without declaration is meaningless
		return this.get_resource().clone().instanciate_processor();
	};

	return this;
}
_var.Processor=varProcessor;
module.exports=_var;
