_NewObject = function()
{
    var Dawn = require("../../Dawn.js");
	Dawn.Fob.call(this,"NewObject");
    this._stored_body=null;
	this._in_lookup_child = function(pipe)
	{
       return Object.assign({_object_name:pipe.resource},new _NewObject());
	}
    this._in_go = function(pipe)
    {
        var newFob = null;
		newFob = new Dawn.Fob();
		newFob._name = this._object_name;
		if (this._stored_body)
		{
			var result = function(str){
			  Dawn.debugInfo("EVAL:"+str);
			  return eval(str);
			}.call(newFob,this._stored_body);
		}

        Dawn.debugInfo("Adding object " + this._name + " to " + pipe._get_owner()._name);
        pipe._get_owner()._add(newFob);
    }
    this._in_native_$ = function(pipe,data)
    {
        this._stored_body = data._source;
    }
}
module.exports=_NewObject;