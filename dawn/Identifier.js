const Resource = Dawn.require('./dawn/Resource.js');
function Identifier()
{
    Resource.call(this,"Identifier");
    let _offer_bind = this._offer_bind;
	this._offer_bind = function(match, origin)
	{
        this._origin = origin;
        return _offer_bind.call(this,match,origin);
    }
    this._in_begin = function()
    {   
		this._origin._name = this._name;
        this._origin._scope._add(this._origin);
    }
    this._in_instanciate = function(string)
    {
        var instance = this._clone();
        instance._name = string.data._value;
        return instance;
    }
}
module.exports=Identifier;
