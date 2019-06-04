_NewObject = function (name)
{
    var self = this;
    var Fob = require("../Fob.js");
	Fob.call(self,name);
	self._type="NewObject";
    self._stored_body=null;
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
          if (self._stored_body)
		  {
			var result = function(str){
			  return eval(str);
			}.call(newFob,self._stored_body);
            //  eval.call(newFob,self._stored_body);
		  }
        }

        console.log("Adding object " + self._object_name + " to " + pipe._get_owner()._name);
        pipe._get_owner()._add(newFob);
    }
    self._in_native_$ = function(pipe,data)
    {
        self._stored_body = data._source;
    }
}
module.exports=_NewObject;