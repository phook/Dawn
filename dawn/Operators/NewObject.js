const Resource  = Dawn.require("./dawn/Resource.js");
_NewObject = function() // SHOULD BE CALLED NEW RESOURCE
{
    // should have input for cloning any object i.e. creating a var String:Hello >> NewObject:HelloText (syntax sugared: var HelloText="Hello") 
	Resource.call(this,"NewObject");
    this._newObject = null;
	this._newName = null;
    this._in_native_$ = function(pipe)
    {
        if (this._newObject)
            this._newObject._in_native_$(pipe);
    }
	this._in_instanciate = function(pipe)
	{
		let colonIndex = pipe._value.indexOf(":");
		if (colonIndex !== -1)
		{
			let varName = pipe._value.substring(0,colonIndex);
			let type = pipe._value.substring(colonIndex+1);
			this._newObject = pipe._scope._lookup(type);
			this._newObject._name = varName;
		}
		else
        if (pipe._value)
		{
            this._newObject = new Resource(pipe._value);        
			this._newName = pipe._value;
		}
		else
			this._newObject = this.clone();
		if (!this._bindee)
			pipe._scope._add(this._newObject);
		else
			this.bindee._add(this._newObject);
        return this._newObject;
	}
}
module.exports=_NewObject;