const Resource = Dawn.require("Content-Type/data/Resource");

// Data.get:headers.host — typed field read with dotted paths.
function get()
{
	Resource.call(this,"get");
	this.Processor = getProcessor;
	return this;
}

function getProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.out_String = null;
	this.out_Number = null;
	this.out_Boolean = null;
	this.out_Data = null;

	this.in_instanciate = function(input)
	{
		let newObject = this.get_resource().clone();
		const tail = (input && input.value || "").split("?")[0].split("#")[0];
		newObject.path = decodeURIComponent(tail).split(".").filter(k => k !== "");
		return newObject.instanciate_processor();
	};

	const self = this;
	this.dig = function(input)
	{
		let v = input && input.value !== undefined ? input.value : input;
		if (v && v.get_resource) v = v.get_resource().value;
		for (const k of resource.path)
		{
			if (v == null) return undefined;
			v = v[k];
		}
		switch (typeof v)
		{
			case "string":  return self.out_String?.({ value: v });
			case "number":  return self.out_Number?.({ value: v });
			case "boolean": return self.out_Boolean?.({ value: v });
			default:         if (v !== undefined) return self.out_Data?.({ value: v }); return undefined;
		}
	};
	this.in_Data_$all = function(input) { return self.dig(input); };
	this.in_request_headers_$all = function(input) { return self.dig(input); };
	return this;
}
get.Processor=getProcessor;
module.exports=get;