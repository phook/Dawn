const Resource  = Dawn.require("Content-Type/data/Resource");

// Routes every element of a flowing list through a referenced resource and
// emits what that resource emits, per element.
// The resource is referenced by URI: parameter ?|using=Number.negate or a
// Reference:Number.negate in the flow.
function runElementThrough(self, target, element) // synchronous burst, keeps program lines from interleaving
{
	let op = target.instanciate_processor ? target.instanciate_processor() : target;
	op.out_String  = (o) => self?.out_String?.(o);
	op.out_Number  = (o) => self?.out_Number?.(o);
	op.out_Boolean = (o) => self?.out_Boolean?.(o);
	op.in_begin?.();
	let port = Object.keys(op).find(k => k.startsWith("in_" + element.type) && !["in_begin","in_end","in_go","in_error","in_instanciate"].includes(k));
	if (port) op[port]({ value: element.value });
	op.in_end?.();
}

function map()
{
	Resource.call(this,"map");
	this.Processor=mapProcessor;
	return this;
}

function mapProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.out_Number = null;
	this.out_Boolean = null;
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
	this.in_end = async function()
    {
		if (!this.using)
			return this?.out_error?.({value:"map: missing 'using' parameter (e.g. ?|using=Number.negate)"});
		let target = await this.lookup(this.using + ":");
		if (!target)
			return this?.out_error?.({value:"map: cannot resolve Reference:" + this.using});
		for (let i in this.elements)
			runElementThrough(this, target, this.elements[i]);
    }
}
map.Processor=mapProcessor;
module.exports=map;