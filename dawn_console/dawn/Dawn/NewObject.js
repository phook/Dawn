_NewObject = function (name)
{
    var self = this;
    var Fob = require("../Fob.js");
	Fob.call(self,name);
	self._type="NewObject";
    var reserved = ["String","Array"]
	if (name)
    {
    	self._object_name=name.substring(10);
	}
    else
		self._object_name="";
	self._in_lookup = function(pipe)
	{
		return new _NewObject(pipe.resource);
	}
    self._in_go = function(pipe)
    {
        // NEW OBJECT BURDE HAVE OPTIONEL INPUTLISTE OVER NEDARVNINGER
        var newFob = null;
        if (reserved.includes(self._object_name))
        {
            var reservedObject = eval(self._object_name+".prototype");
            Fob.call(reservedObject,self._object_name);
            newFob = reservedObject;
        }
        else
        {
          newFob = new Fob(self._object_name);
        }

        // MUST BE CREATED IN CURRENT SCOPE
        // AFTERWARDS CHANGE SCOPE TO THE NEW CREATION - is this possible?!?
        //if (pipe.bindee && pipe.bindee.resource)
        //{
        //    pipe.bindee.resource._add(newFob);
        //}
        //else
        {
            // owner of the pipe should be the current scope
            console.log("Adding object " + self._object_name + " to " + pipe._get_owner()._name);
            pipe._get_owner()._add(newFob);
            // create in current scope
        }
    }
}
module.exports=_NewObject;