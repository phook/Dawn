const Resource = Dawn.require("Content-Type/data/Resource");

// env:NAME — reads a process environment variable, hands it downstream as String
function env()
{
	Resource.call(this,"env");
	this.Processor=envProcessor;
	return this;
}
function envProcessor(resource)
{
	Resource.Processor.call(this,resource);
	this.resource=resource;
	this.out_String=null;
	this.in_instanciate=function(input)
	{
		let n=this.get_resource().clone();
		n.value=decodeURIComponent(input.value);
		return n.instanciate_processor();
	};
	this.in_go=function()
	{
		let v=(typeof process!=="undefined"&&process.env)?process.env[resource.value]:undefined;
		const StringRes=Dawn.require("Content-Type/data/String");
		let s=new StringRes();
		s.value=(v===undefined||v===null)?"":String(v);
		return this.out_String?.(s);
	};
	return this;
}
env.Processor=envProcessor;
module.exports=env;