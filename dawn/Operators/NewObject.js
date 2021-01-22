const Fob  = Dawn.require("./dawn/Fob.js");
_NewObject = function()
{
	Fob.call(this,"NewObject");
    this._stored_body=null;
	this._in_lookup_child = function(pipe)
	{
       return Object.assign({_object_name:pipe._value},new _NewObject());
	}
    this._in_go = function(scope)
    {
        var newFob = null;
		newFob = new Fob();
		newFob._name = this._object_name;
		if (this._stored_body)
		{
            /*
			var result = function(str){
			  Dawn.debugInfo("EVAL:"+str);
			  return eval(str);
			}.call(newFob,this._stored_body);
		    */
            Function(this._stored_body).call(newFob);
        }

        Dawn.debugInfo("Adding object " + this._name + " to " + scope._name);
        scope._add(newFob);
    }
    this._in_native_$ = function(data)
    {
        this._stored_body = data._value;
    }
}
module.exports=function(scope){scope._add(new _NewObject());};