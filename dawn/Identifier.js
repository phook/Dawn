const Resource = Dawn.require('./dawn/Resource.js');
function Identifier()
{
    Resource.call(this,"Identifier");
    let _offer_connection = this._offer_connection;
	this._offer_connection = function(match)
	{
        return _offer_connection.call(this,match);
    }
    this._in_begin = function()
    {   
        this._origin._name = this._name;
    }
    this._in_instanciate = function(string)
    {
        var instance = this._clone();
        instance._name = string.data.value;
        return instance;
    }
}
module.exports=Identifier;
