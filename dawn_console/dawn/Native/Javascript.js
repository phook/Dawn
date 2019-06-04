function _Javascript(name)
{
    var self = this;
    var Fob = require("../Fob.js");
    Fob.call(self,name);
    self._type="Javascript";
    self._out_native=null;
    self._out_go=null;
    if (!name)
        name="";
    self._source = decodeURIComponent(name.substring(11));;
    console.log(self._source);
    //self._function = eval("[" + self._source + "][0]");
    self._in_lookup=function(name)
    {
        return new _Javascript(name);
    }
    self._in_go = function(pipe)
    {
        if (pipe._out_native)
            pipe._out_native._call(self);
        if (pipe._out_go)
            pipe._out_go._call(self);
    }
} 
module.exports = _Javascript;