const Fob = Dawn.require("./dawn/Fob.js");
function _Javascript()
{
    Fob.call(this,"Javascript");
    this._out_native=null;
    this._out_go=null;
    this._in_instanciate=function(identifier)
    {
       return Object.assign({_value:decodeURIComponent(identifier._value)},new _Javascript());
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