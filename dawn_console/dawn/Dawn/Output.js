_Output = function (name)
{
    var self = this;
    var Fob = require("../Fob.js");
	Fob.call(self,name);
	self._type="Input";
	self._out_native=null;
	if (name)
    {
    	self._name_of_output=name.substring(7);
	}
    else
		self._name_of_output="";
	self._in_lookup = function(pipe)
	{
		return new _Output(pipe.resource);
	}
    self._in_go = function(pipe,data)
    {
        if (pipe._out_native)
        {
            console.log("Adding output _out_"+self._name_of_output + " to " +  pipe._out_native.reference._name);
            pipe._out_native.reference["_out_"+self._name_of_output] = null;
        }
        //else in current scope
    }
}
module.exports=_Output;