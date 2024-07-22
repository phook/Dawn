const Resource  = Dawn.require("./dawn/Resource.js");
_NewResource = function() // SHOULD BE CALLED NEW RESOURCE
{
    // should have input for cloning any object i.e. creating a var String:Hello >> NewResource:HelloText (syntax sugared: var HelloText="Hello") 
	Resource.call(this,"NewResource");
    this._newObject = null;
	this._newName = null;
    this._in_native$ = function(native)
    {
        if (this._newObject)
            this._newObject._in_native$(native);
    }
	this._in_instanciate = function(string)
	{
		let colonIndex = string.data._value.indexOf(":");
		if (colonIndex !== -1)
		{
			let varName = string.data._value.substring(0,colonIndex);
			let type = string.data._value.substring(colonIndex+1);
			this._newObject = string._scope._lookup(type);
			this._newObject._name = varName;
		}
		else
        if (string.data._value)
		{
            this._newObject = new Resource(string.data._value);        
			this._newName = string.data._value;
		}
		else
			this._newObject = this.clone();
		if (!this._connectee)
			string._scope._add(this._newObject);
		else
			this.bindee._add(this._newObject);
        return this._newObject;
	}
}
module.exports=_NewResource;