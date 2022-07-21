const Fob  = Dawn.require("./dawn/Fob.js");
_NewObject = function()
{
    // should have input for cloning any object i.e. creating a var String:Hello >> NewObject:HelloText (syntax sugared: var HelloText="Hello") 
	Fob.call(this,"NewObject");
    this._newObject = null;
    this._in_go=function(scope)
    {
        if (this._newObject)
            scope._add(this._newObject);        
    }
    this._in_native_$ = function(pipe)
    {
        if (this._newObject)
            this._newObject._in_native_$(pipe);
    }
	this._in_instanciate = function(pipe)
	{
        /*
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
        */
        let newObject = this._clone();
        if (pipe._value)
            newObject._newObject = new Fob(pipe._value);        

        return newObject;
	}
}
module.exports=_NewObject;