function _Javascript(name)
{
    var self = this;
    var Fob = require("../Fob.js");
    Fob.call(self,name);
    self._type="Javascript";
    self._out_pipe=null;
    if (!name)
        name="";
    self._source = decodeURIComponent(name.substring(11));;
    console.log(self._source);
    //self._function = eval("[" + self._source + "][0]");
    self._lookup=function(name)
    {
        return new _Javascript(name);
    }
    self._in_go = function(pipe)
    {
        if (pipe._out_pipe)
            pipe._out_pipe._call(self);
        else
        if (pipe._function)
            pipe._function();
    }
} 
module.exports = _Javascript;