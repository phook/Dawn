const Resource = Dawn.require("./dawn/Resource.js");
_Output = function ()
{
	Resource.call(this,"NewOutput");
	this._out_native=null;
	this._in_instanciate = function(identifier)
	{
       return Object.assign({_output_name:identifier.data._value},new _Output());
	}
    this._in_go = function(data)
    {
        if (this._out_native)
        {
            Dawn.debugInfo("Adding output _out_"+this._output_name + " to " +  this._out_native._name);
            this._out_native({data:{_value:"this._out_"+this._output_name+"=null;"}});
        }
        //else in current scope
    }
}
module.exports=_Output;