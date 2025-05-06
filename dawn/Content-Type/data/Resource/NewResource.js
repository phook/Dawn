const Resource  = Dawn.require("./dawn/Resource.js");
_NewResource = function() // SHOULD BE CALLED NEW RESOURCE
{
    // should have input for cloning any object i.e. creating a var String:Hello >> NewResource:HelloText (syntax sugared: var HelloText="Hello") 
	Resource.call(this,"NewResource");
    
	// list input for receiving the "program" which creates the resource
	
	this.newObject = null;
	this.newName = null;
    this.in_native$ = function(native)
    {
        if (this.newObject)
            this.newObject.in_native$(native);
    }
	this.in_instanciate = function(string)
	{
		let colonIndex = string.data.value.indexOf(":");
		if (colonIndex !== -1)
		{
			let varName = string.data.value.substring(0,colonIndex);
			let type = string.data.value.substring(colonIndex+1);
			this.newObject = string.scope.lookup(type);
			this.newObject.name = varName;
		}
		else
        if (string.data.value)
		{
            this.newObject = new Resource(string.data.value);        
			this.newName = string.data.value;
		}
		else
			this.newObject = this.clone();
		if (!this.connectee)
			string.scope.add(this.newObject);
		else
			this.bindee.add(this.newObject);
        return this.newObject;
	}
}
module.exports=_NewResource;