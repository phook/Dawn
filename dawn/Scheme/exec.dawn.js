const Resource = Dawn.require("Content-Type/data/Resource");
const StringRes = Dawn.require("Content-Type/data/String");

// exec: runs a shell command and hands stdout downstream as String on
// completion. Non-zero exit or a spawn error goes to out_error.
// localhost-scoped use only (IDE save hooks etc.).
//
// Flows propagate through ports: only the chain head's in_go fires, so the
// command runs when it ARRIVES on in_String / in_octetstream.
function exec()
{
	Resource.call(this,"exec");
	this.Processor = execProcessor;
	return this;
}

function execProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_String = null;
	let command = "";
	let done = false;

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		newObject.command = decodeURIComponent(input.value || "");
		return newObject.instanciate_processor();
	};
	if (resource.command) command = resource.command;

	this.in_String_$all = function(input) { command = input.value; this.run(); };
	this.in_octetstream_$all = function(input)
	{
		command = new TextDecoder().decode(input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value));
		this.run();
	};

	this.in_go = function() { this.run(); }; // URI-supplied command at boot

	this.run = function()
	{
		if (done || !command) return;
		done = true;
		const self = this;
		require("child_process").exec(command, { windowsHide: true }, function(err, stdout, stderr) {
			if (err)
			{
				self.out_error?.({ value: (stderr || err.message || "exec failed").toString() });
				return;
			}
			let s = new StringRes();
			s.value = String(stdout);
			self.out_String?.(s);
		});
	};
	return this;
}
exec.Processor = execProcessor;
module.exports = exec;