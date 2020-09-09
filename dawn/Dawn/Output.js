_Output = function ()
{
    var Dawn = require("../../Dawn.js");
	Dawn.Fob.call(this,"Output");
	this._out_native=null;
	this._in_lookup_child = function(pipe)
	{
       return Object.assign({_output_name:pipe.resource},new _Output());
	}
    this._in_go = function(pipe,data)
    {
        if (pipe._out_native)
        {
            Dawn.debugInfo("Adding output _out_"+this._output_name + " to " +  pipe._out_native.reference._name);
            pipe._out_native.reference["_out_"+this._output_name] = null;
        }
        //else in current scope
    }
}
module.exports=_Output;