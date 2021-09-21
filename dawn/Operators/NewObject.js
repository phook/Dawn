const Fob  = Dawn.require("./dawn/Fob.js");
_NewObject = function()
{
    // should have input for cloning any object i.e. creating a var String:Hello >> NewObject:HelloText (syntax sugared: var HelloText="Hello") 
	Fob.call(this,"NewObject");
    this._stored_body=null;
	this._in_lookup_child = function(pipe)
	{
        var newObject;
        var separator = pipe._value.indexOf("_");
        var name;
        // "_" means a typed new object so lookup the type
        if (separator!=-1)
        {
            newObject = pipe._scope.lookup(pipe._value.substring(0,separator)+":");
            name = pipe._value.substring(separator+1);
        }
        else
        {
            newObject = new Fob();
            name= pipe._value;
        }
        newObject._name = name;
        if (name != "")
            pipe._scope._add(newObject);
        return newObject;
	}
}
module.exports=function(scope){scope._add(new _NewObject());};