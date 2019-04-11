DawnString = function (name)
{
    var self = this;
    var Fob = require("./Fob.js");
	Fob.call(self,name);
	self._type="String";
	self._out_string = null;
	if (name)
    {
    	self._value=name.substring(7);
	}
    else
		self._value="";
	self._lookup = function(value)
	{
        if (value == self.name) return self;
		return new DawnString(value);
	}
	self._in_string = function(pipe,s)
	{
		self._value = s._value;
	}
	self._in_go = function(pipe)
	{
		if (pipe._out_string)
		{
			pipe._out_string._call(self);
		}
	}
}



module.exports=DawnString;

/* Dawn Version
This is how it looks because the javascript functions are uriencoded

Dawn.NewObject:String >> Root
Native:Javascript:<Fob holding string value>   >> Root.String.AddChild
Native:Javascript:<Function taking Child>   >> Dawn.Input:string >> Root.String
Dawn.Output:string >> Root.String
Native:Javascript:<Function sending Child to string output>   >> Dawn.Input:end >> Root.String

begin and end inputs does not take paramerters - pipe is run by calling being then end

Native.Javascript:(function%28name%29%0A%7B%0A%20%20%20%20var%20Fob%20%3D%20require%28%22.%2FFob.js%22%29%3B%0A%09Fob.call%28this%2Cname%29%3B%0A%09this._type%3D%22String%22%3B%0A%09this._out_string%20%3D%20null%3B%0A%09if%20%28name%29%0A%20%20%20%20%7B%0A%20%20%20%20%09this._value%3Dname.substring%287%29%3B%0A%09%7D%0A%20%20%20%20else%0A%09%09this._value%3D%22%22%3B%0A%7D) >> Define.Fob:String >> Root
Native.Javascript:(function%28value%29%0A%7B%0A%09return%20new%20DawnString%28value%29%3B%0A%7D) >> Define.Input:lookup >> Root.String
Native.Javascript:(function%28%29%0A%7B%0A%09if%20%28this._out_string%29%0A%09%7B%0A%09%09this._out_string._call%28this%29%3B%0A%09%7D%0A%7D) >> Define.Input:go >> Root.String

DawnString = function (name)
{
    var Fob = require("./Fob.js");
	Fob.call(this,name);
	this._type="String";
	this._out_string = null;
	if (name)
    {
    	this._value=name.substring(7);
	}
    else
		this._value="";
	this._lookup = function(value)
	{
		return new DawnString(value);
	}
	this._in_string = function(s)
	{
		this._value = s._value;
	}
	this._in_go = function()
	{
		if (this._out_string)
		{
			this._out_string._call(this);
		}
	}
}
module.exports=DawnString;
*/