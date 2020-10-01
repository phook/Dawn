const Fob = Dawn.require("./dawn/Fob.js");
function _Javascript()
{
    Fob.call(this,"Javascript");
    this._out_native=null;
    this._out_go=null;
    this._in_lookup_child=function(pipe)
    {
       return Object.assign({_source:decodeURIComponent(pipe.resource)},new _Javascript());
    }
    this._in_go = function(pipe)
    {
        if (pipe._out_native)
            pipe._out_native._call(this);
        if (pipe._out_go)
            pipe._out_go._call(this);
    }
} 
module.exports = _Javascript;