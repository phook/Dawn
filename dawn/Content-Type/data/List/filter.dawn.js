const Resource  = Dawn.require("Content-Type/data/Resource");
const castLib   = Dawn.require("Scheme/cast");

// Keeps the elements of a flowing list for which a referenced resource
// answers true. The predicate is referenced by URI: ?|using=Boolean.not or
// with Reference:Boolean.not in the flow. A list can mix any types, so each
// kept element's type is known only at execution time — filter declares no
// typed outputs; like http:, it late-connects each kept element in its own
// typed resource.
function testElement(target, element) // synchronous burst, keeps program lines from interleaving
{
	let keep = false;
	let op = target.instanciate_processor ? target.instanciate_processor() : target;
	op.out_Boolean = (o) => { keep = !!o.value; };
	op.in_begin?.();
	let port = Object.keys(op).find(k => k.startsWith("in_" + element.type) && !["in_begin","in_end","in_go","in_error","in_instanciate"].includes(k));
	if (port) op[port]({ value: element.value });
	op.in_end?.();
	return keep;
}

function filter()
{
	Resource.call(this,"filter");
	this.Processor=filterProcessor;
	return this;
}

function filterProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource = resource;
	this.in_begin = function()
	{
		this.using = null;
		this.elements = [];
		return this.fire_end_parameters(); // pre-positioned parameter inputs
    }
    function collect(type)
    {
		return function(input) { this.elements.push({type:type, value:input.value}); };
    }
	this.in_Reference_using = function(input) { this.using = input.reference; }
	this.in_String_using_$explicit = function(input) { this.using = input.value; } // parameter drop-in
	this.in_String_$all = collect("String");
	this.in_Number_$all = collect("Number");
	this.in_Boolean_$all = collect("Boolean");
	this.in_octetstream_$all = collect("octetstream");
	this.in_end = async function()
    {
		if (!this.using)
			return this?.out_error?.({value:"filter: missing 'using' parameter (e.g. ?|using=Boolean.not)"});
		let target = await this.lookup(this.using + ":");
		if (!target)
			return this?.out_error?.({value:"filter: cannot resolve Reference:" + this.using});
		for (let i in this.elements)
		{
			if (!testElement(target, this.elements[i]) || !this.connectee) continue;
			// late connect (like http:) — the type is known only now
			let cast = castLib.castValue(this.elements[i].type, this.elements[i].value);
			if (cast)
			{
				cast.connect(this.connectee);
				cast.in_go?.();
			}
		}
    }
}
filter.Processor=filterProcessor;
module.exports=filter;