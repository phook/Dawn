const Resource = Dawn.require("Content-Type/data/Resource");

// httpConnection.path — the request-path adapter for the file-reading
// routes. Two modes, chosen by the URI tail:
//
// BARE  httpConnection.path: — the /file:/// read-route adapter: only
//   /file:/// paths flow on (the raw path, undecoded — the reference file
//   route serves them as-is); everything else stays silent.
//
// BASE  httpConnection.path:<base> — the static-mount adapter: serves the
//   files under <base> (e.g. httpConnection.path:public). Skips /file:///
//   paths (the /file:/// adapter owns those). Rejects ".." traversal with
//   403 Forbidden (express.static parity). "/" serves <base>/index.html.
//   A path whose file does not exist stays SILENT — the request falls
//   through to the catch-all 204 (express.static's next() parity).
// The emitted path feeds file:'s in_String_read; the content-type comes
// from the file resource's reference mime handling.
function path()
{
	Resource.call(this,"path");
	this.Processor = pathProcessor;
	return this;
}

function pathProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_String = null;

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		newObject.base = (input && input.value) ? decodeURIComponent(input.value) : "";
		return newObject.instanciate_processor();
	};

	this.in_httpConnection_$all = function(input)
	{
		const conRes = (input && input.get_resource) ? input.get_resource() : input;
		const meta = conRes && conRes.value;
		if (!meta || typeof meta.url === "undefined") return;
		const url = String(meta.url).split("?")[0];
		if (!Dawn.isServer()) return;
		const emit = (value) =>
		{
			const s = new (Dawn.require("Content-Type/data/String"))();
			s.value = value;
			return this.out_String?.(s.instanciate_processor());
		};
		if (resource.base)
		{
			// static-mount mode: serve <base> to local GETs
			if (url.indexOf("/file:///") === 0) return; // the /file:/// adapter owns these
			const segments = url.split("/");
			if (segments.indexOf("..") !== -1)
			{
				return this.out_error?.({ value: "Forbidden", status: 403 });
			}
			let rel = url === "/" || url === "" ? "/index.html" : url;
			const _fs = require("fs");
			const abs = require("path").resolve(resource.base + rel);
			if (!_fs.existsSync(abs) || !_fs.statSync(abs).isFile()) return; // fall through to the catch-all 204
			emit(resource.base + rel);
			return;
		}
		// bare mode: the /file:/// read-route adapter
		if (url.indexOf("/file:///") !== 0) return;
		emit(url);
	};
	return this;
}
path.Processor = pathProcessor;
module.exports = path;
