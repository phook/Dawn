const Fob = Dawn.require("./dawn/Fob.js");
_Output = function ()
{
	Fob.call(this,"NewOutput");
	this._out_native=null;
	this._in_lookup_child = function(identifier)
	{
       return Object.assign({_output_name:identifier._value},new _Output());
	}
    this._in_go = function(data)
    {
        if (this._out_native)
        {
            Dawn.debugInfo("Adding output _out_"+this._output_name + " to " +  this._out_native._name);
            this._out_native({_value:"this._out_"+this._output_name+"=null;"});
        }
        //else in current scope
    }
}
module.exports=function(scope){scope._add(new _Output());};