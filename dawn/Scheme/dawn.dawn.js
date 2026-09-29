const Resource = Dawn.require("Content-Type/data/Resource");
const StringRes = Dawn.require("Content-Type/data/String");
const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;

// dawn: — the meta resource. Receives canonical Dawn source (String or the
// octetstream interface), compiles it with the DawnCompiler and runs it on a
// fresh processor. Prints of the inner program are forwarded as out_String
// events; failures go to out_error.
//
// Flows propagate through ports: only the chain head's in_go fires, so the
// run must start when source ARRIVES on in_String / in_octetstream.
function dawn()
{
	Resource.call(this,"dawn");
	this.Processor = dawnProcessor;
	return this;
}

function dawnProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_String = null;
	let source = "";
	let ran = false;

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		newObject.source = decodeURIComponent(input.value || "");
		return newObject.instanciate_processor();
	};
	if (resource.source) source = resource.source;

	this.in_String_$all = function(input) { source = input.value; this.run(); };
	this.in_octetstream_$all = function(input)
	{
		source = new TextDecoder().decode(input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value));
		this.run();
	};

	this.in_go = function() { this.run(); }; // URI-supplied source: nothing arrives through a port

	this.run = function()
	{
		if (ran || !source) return;
		ran = true;
		const self = this;
		const compiled = new (Dawn.require("DawnCompiler"))().parse(source);
		if (typeof compiled !== "string" || compiled.indexOf("ERROR") === 0)
		{
			this.out_error?.({ value: "dawn: source failed to compile" });
			return;
		}
		const prevPrint = Dawn.print; // swap the print channel for the inner run
		Dawn.print = function(text)
		{
			let s = new StringRes();
			s.value = String(text);
			self.out_String?.(s);
		};
		(async function() {
			try
			{
				const processor = Dawn.instanciate_processor();
				const list = await (new AsyncFn("return " + compiled)).call(processor);
				if (list) await list.in_go();
			}
			catch (err)
			{
				self.out_error?.({ value: String(err && err.message || err) });
			}
			finally
			{
				Dawn.print = prevPrint;
			}
		})();
	};
	return this;
}
dawn.Processor = dawnProcessor;
module.exports = dawn;