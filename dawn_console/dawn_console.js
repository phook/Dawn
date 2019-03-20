var express = require('express');
var http = require('http');
var hub     = require('./hubserver.js');
var app = express();
var server = http.createServer(app);
var bnft = require("./BNFT.js");
var fs = require('fs')

var oldEval = eval;
eval = (function(eval) { return function(code) { return eval(code) } })(eval);

hub.createServer(server);

app.use(express.static('public'));

server.listen(5000, function () {
})

var parser = null;
fs.readFile("dawn.bnft", 'utf8', function(err, source) {
  if (err) 
  {
	  console.log("error reading dawn.bnft");
	  throw err;
  }
  parser = new bnft(source, console.log);
  console.log("dawn parser loaded");
});


/// _list(list of fobs) , _lookup(url), _bind(next in line)


_Dawn_Identifiers = {};
function Fob(name)
{
	this._string = name;
	_Dawn_Identifiers[name] = this;
	this._start = null;
	this._setstart = function(start)
	{
		this._start = start;
	}
	this._new = function()
	{
		return new Fob("");
	}
	this._lookup = function(identifier)
	{
		//console.log("lookup(" + identifier +")");
		for(id in _Dawn_Identifiers)
		{
			if (identifier.indexOf(id) == 0)
			{
				return _Dawn_Identifiers[id]._new(identifier);
			}
		}
	    return new Fob(identifier);
	}
	this._bind = function(bindee)
	{
		//console.log(this._string + " binds("+bindee._string+")");
		bindee._setstart(this);
		
		for(a in this)
		{
			if (a.indexOf("_out_") == 0)
			{
				match = a.substr(5);
				for(b in bindee)
				{
					if (b == ("_in_" + match))
					{
						this[a] = bindee;
					}
				}
			}
		}
		
		return bindee;
	}
	this._list = function() // args
	{
		var inputs="";
        var args = Array.prototype.slice.call(arguments);
        args.forEach(function(element) {
            inputs += element._string + " ";
        }, this);
		//console.log("list of " + inputs);
		return new List("list of "+inputs);
	}
	this._pipe = function(pipe)
	{
		return pipe;
	}
	this._go = function()
	{
		if (this._start)
			this._start._go();
	}
	return this;
}

function List()
{
	Fob.call(this,"List");
	this._bind = function(bindee)
	{
		//console.log("bind("+bindee._string+")");
		return bindee;
	}
	this._new = function()
	{
		return new List();
	}
}


function String()
{
	Fob.call(this,"String");
	this._out_string = null;
	this._value="";
	this._new = function(id)
	{
		var newString = new String();
		newString._value=id.substring(7); 
		return newString;
	}
	this._go = function()
	{
		if (this._out_string)
		{
			this._out_string._in_string(this._value);
		}
	}
}

function Console()
{
	Fob.call(this,"Console");
	this._new = function()
	{
		return new Console("");
	}
	this._in_string = function(s)
	{
		var do_eval = "print(\"" + s + "\")"
		server.clients.eval(do_eval);
	}
	
}

new String();
new Console();

function dawnCommand(command)
{
	if (parser)
	{
	    var source = parser.parse(command + "\n",console.log);
		//console.log(source);
		if (source != "ERROR")
		{
			var fob = new Fob();
			eval.call(fob,source);
		}
	}
}

