  const Resource = Dawn.require("Content-Type/data/Resource");
  const StringRes = Dawn.require("Content-Type/data/String");
  const mk = require("mime-kind");
  const lookupExt = require("mime-types").lookup;
  
  // mime:png — answers "image/png". Content-aware: bytes arriving on the
  // octetstream interface get sniffed (magic bytes beat the extension); an
  // unmatched extension falls back to "binary/<ext>"; nothing at all answers
  // "application/octet-stream".
  function mime()
  {
  	Resource.call(this,"mime");
  	this.Processor = mimeProcessor;
  	return this;
  }
  
  function mimeProcessor(resource)
  {
  	Resource.Processor.call(this,resource);
  	this.resource = resource;
  	this.out_String = null;
  	let bytes = null;
  	let done = false;
  
  	function byExt()
  	{
  		if (!resource.ext) return "application/octet-stream";
  		if (bytes) return "application/octet-stream";
  		const hit = lookupExt(resource.ext);
  		return hit ? hit : "binary/" + resource.ext.replace(".", "");
  	}
  
  	function answerWith(value)
  	{
  		let s = new StringRes();
  		s.value = value;
  		this.out_String?.(s);
  	}
  
  	function run()
  	{
  		if (done) return;
  		done = true;
  		if (bytes)
  		{
  			const self = this;
  			mk(Buffer.from(bytes), null).then(function(r) {
  				if (r && r.mime) answerWith.call(self, r.mime);
  				else answerWith.call(self, byExt());
  			}, function() { answerWith.call(self, byExt()); });
  			return;
  		}
  		answerWith.call(this, byExt());
  	}
  
  	this.run = run;
  
  	this.in_instanciate = function(input)
  	{
  		let newObject = this.get_resource().clone();
  		newObject.ext = decodeURIComponent(input.value || "");
  		return newObject.instanciate_processor();
  	};
  
  	this.in_octetstream_$all = function(input)
  	{
  		bytes = input.value instanceof Uint8Array ? input.value : new Uint8Array(input.value);
  		this.run(); // flow steps start on receipt — flows propagate through ports
  	};
  
  	this.in_go = function() { this.run(); }; // identifier-only use at chain head
  	return this;
  }
  mime.Processor = mimeProcessor;
  module.exports = mime;