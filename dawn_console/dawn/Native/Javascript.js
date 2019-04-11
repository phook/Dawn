function _Javascript(name)
{
    var self = this;
    var Fob = require("../Fob.js");
    Fob.call(self,name);
    self._type="Javascript";
    self._out_pipe=null;
    if (!name)
        name="";
    var decoded = decodeURIComponent(name.substring(11));
    console.log(decoded);
    self._function = eval("[" + decoded + "][0]");
    self._lookup=function(name)
    {
        return new _Javascript(name);
    }
    self._in_go = function()
    {
        if (self._out_pipe)
            self._out_pipe._call(self);
        else
        if (self._function)
            self._function();
    }
} 
module.exports = _Javascript;