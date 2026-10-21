const Resource = Dawn.require("Content-Type/data/Resource");

function upload()
{
	Resource.call(this,"upload");
	this.Processor = uploadProcessor;
	return this;
}

function uploadProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_Data  = null;
	this.out_error = null;

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		return newObject.instanciate_processor();
	};

	this.in_httpConnection_$all = function(input)
	{
		const conRes = (input && input.get_resource) ? input.get_resource() : input;
		const meta = conRes && conRes.value;
		if (!meta) return;
		const url = String(meta.url || "");
		if (String(meta.method || "").toUpperCase() !== "PUT") return;
		if (url.split("?")[0] !== "/_file") return;
		if (!Dawn.isServer()) return;

		const reject = (status, message) => this.out_error?.({ value: message, status: status });

		// localhost only (isLocalRequest parity: host header, portless)
		const host = String((meta.headers && meta.headers.host) || "");
		const hostname = host.replace(/[[\]]/g, "").replace(/:\d+$/, "");
		if (["localhost","127.0.0.1","::1","::ffff:127.0.0.1"].indexOf(hostname) === -1)
		{
			reject(403, "Local requests only");
			return;
		}
		const query = url.split("?")[1] || "";
		const filePath = new URLSearchParams(query).get("path");
		if (!filePath)
		{
			reject(400, "Missing path query parameter");
			return;
		}
		const d = new (Dawn.require("Content-Type/data/Data"))();
		d.value = { path: filePath, content: conRes.body };
		return this.out_Data?.(d.instanciate_processor());
	};
	return this;
}
upload.Processor = uploadProcessor;
module.exports = upload;