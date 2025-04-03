const Resource = Dawn.require("./dawn/Resource.js");
_Output = function ()
{
	Resource.call(this,"NewOutput");
	this.out_native=null;
	this.in_instanciate = function(identifier)
	{
       return Object.assign({_output_name:identifier.data.value},new _Output());
	}
    this.in_go = function(data)
    {
        if (this.out_native)
        {
            Dawn.debugInfo("Adding output _out_"+this.output_name + " to " +  this.out_native.name);
            this.out_native({data:{value:"this.out_"+this.output_name+"=null;"}});
        }
        //else in current scope
    }
}
module.exports=_Output;