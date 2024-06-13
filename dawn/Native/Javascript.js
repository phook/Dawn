const Resource = Dawn.require("./dawn/Resource.js");
function _Javascript()
{
    Resource.call(this,"Javascript");
    this._out_native=null;
    this._out_go=null;
    this._in_instanciate=function(identifier)
    {
       return Object.assign({data:{_value:decodeURIComponent(identifier.data._value)}},new _Javascript());
    }
    this._in_go = function(scope)
    {
        if (this._out_native)
            this._out_native(this);
        if (this._out_go)
            this._out_go(scope);
    }
} 
module.exports = _Javascript;