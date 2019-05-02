_NewObject = function (name)
{
    var self = this;
    var Fob = require("../Fob.js");
	Fob.call(self,name);
	self._type="NewObject";
	if (name)
    {
    	self._object_name=name.substring(10);
	}
    else
		self._object_name="";
	self._lookup = function(value)
	{
		return new _NewObject(value);
	}
	self._bind = function(bindee)
	{
        bindee._setprevious(self);
        self._bindee = bindee;
        return bindee;
	}
    self._in_go = function(pipe)
    {
        /*if (pipe._out_go && pipe._out_go.resource)
        {
            console.log("here2");    
            pipe._out_go.resource._add(new Fob(self._object_name));
        }*/
        if (pipe.bindee && pipe.bindee.resource)
        {
            pipe.bindee.resource._add(new Fob(self._object_name));
        }
        else
        {
            // create in current scope
        }
    }
}
module.exports=_NewObject;