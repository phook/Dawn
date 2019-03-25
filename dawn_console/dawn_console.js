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

var debug = false;
function debugInfo(s)
{
	  if (debug)
		  console.log(s);
}

/// _list(list of fobs) , _lookup(url), _bind(next in line)


function _call(obj,fn)
{
	this._call = function()
	{
		fn.apply(obj,arguments);
	}
}

function testMain(obj, text)
{
	debugInfo(text + " settingprevious for " + this.type + " to " + obj._type);
	if (typeof(obj.main) != "undefined")
		throw "error "+text;
}

_Dawn_Identifiers = {};
function Fob(name)
{
	this._name = name;
	this._type="Fob";
	if (name)
       _Dawn_Identifiers[name] = this;
	this._previous = null;
	this._setprevious = function(previous)
	{
		testMain(previous, "in the setprevious function");
		this._previous = previous;
	}
	this._new = function()
	{
		return new Fob("");
	}
	this._lookup = function(identifier)
	{
		debugInfo("lookup(" + identifier +")");
		for(id in _Dawn_Identifiers)
		{
			if (identifier.indexOf(id) == 0)
			{
				return _Dawn_Identifiers[id]._new(identifier);
			}
		}
		throw "id not found: "+identifier;
	    return new Fob(identifier);
	}
	this._bind = function(bindee)
	{
		var id = this._type;
		if (typeof(this._value) != "undefined")
			id+=this._value;
		debugInfo(id + " binds("+bindee._type+")");
		testMain(this, "in the Fob._bind function");
		bindee._setprevious(this);

		for(a in this)
		{
			if (a.indexOf("_out_") == 0)
			{
				match = a.substr(5);
				for(b in bindee)
				{
					if ((b == "_in_" + match) || (b.indexOf("_in_"+match+"_") == 0))
					{
						if ((b.indexOf("_$")==(b.length-2)) || typeof(bindee[b+"@"]) == "undefined")
						{
                     		debugInfo("  " + a + " connects to"+b);
							bindee[b+"@"] = true;
							this[a] = new _call(bindee,bindee[b]);
							break;
						}
					}
				}
			}
		}
		
		return bindee;
	}
	this._list = function() // args
	{
		var newList = new List();
		var inputs="";
        var args = Array.prototype.slice.call(arguments);
        args.forEach(function(element) {
			testMain(newList, "in the _list function in the loop");
			element._setprevious(newList);
            newList._elements.push(element);
        });
		testMain(newList, "in the _list function");
		return newList;
	}
	this._pipe = function(pipe)
	{
		return (new Pipe())._new(pipe);
	}
	this._go = function()
	{
		debugInfo("fob go called");
        this._go_from_start();
	}
	this._go_from_start = function()
	{
		debugInfo("fob go_from_start called");
		if (this._previous)
		{
            var a=1;
			debugInfo(a);
			var first = this._previous;
			
			var loopTest = [first];
			
			while (first._previous)
			{
				debugInfo(++a);	
				first = first._previous;
			    loopTest.forEach(function(element){
				  if (first == element)
					  throw "circular ref error";
				});
				loopTest.push(first);
			}
			debugInfo(JSON.stringify(first,function( key, value) {if (key == "_previous") return ""; return value;}));
			first._go();
		}
	}
	return this;
}

function Pipe(name)
{
	Fob.call(this,name);
	this._type="Pipe";
	this._bind = function(bindee)
	{
		this._element._bind(bindee);
	}
	this._new = function(element)
	{
		var newPipe = new Pipe();
		newPipe._element = element;
		return newPipe;
	}
	this._go = function()
	{
		debugInfo("pipe go called");
		this._element._go_from_start();
	}
}

function List(name)
{
	Fob.call(this,name);
	this._elements=[];
	this.bindee = null;
	this._type="List";
	this._bind = function(bindee)
	{
		debugInfo("List bind("+bindee._type+")");
		for(element in this._elements)
		{
			testMain(this, "in the List._bind function");
	        this._elements[element]._setprevious(this);
			this._elements[element]._bind(bindee);
		}
	    bindee._setprevious(this);
		this.bindee = bindee;
		return bindee;
	}
	this._new = function()
	{
		return new List();
	}
	this._go = function()
	{
		debugInfo("list go called");
		for(element in this._elements)
		{
			debugInfo("running element in list");
			this._elements[element]._go();
		}
		this.bindee._go();
	}
}


function String(name)
{
	Fob.call(this,name);
	this._type="String";
	this._out_string = null;
	if (name)
    	this._value=name.substring(7);
	else
		this._value="";
	this._new = function(value)
	{
		debugInfo("returning new String");
		var newString = new String();
		newString._value = value.substring(7);
		return newString;
	}
	this._go = function()
	{
		debugInfo("string go called out="+this._value);
		if (this._out_string)
		{
			this._out_string._call(this._value);
		}
	}
}

function Concatenate(name)
{
	Fob.call(this,name);
	this._type="Concatenate";
	this._out_string = null;
	this._value = "";
	this._in_string_$ = function(s)
	{
		this._value += s;
	}
	this._new = function()
	{
		debugInfo("returning new Concatenate");
		return new Concatenate();
	}
	this._go = function()
	{
		debugInfo("concat go called out="+this._value);
		if (this._out_string)
			this._out_string._call(this._value);
    	this._value = "";
	}
}

function Console(name)
{
	Fob.call(this,name);
	this._type="Console";
	this._new = function()
	{
		return new Console();
	}
	this._in_string = function(s)
	{
		var do_eval = "print(\"" + s + "\")"
		debugInfo(do_eval);
		server.clients.eval(do_eval);
	}
}

new String("String");
new Concatenate("Concatenate");
new Console("Console");

function dawnCommand(command)
{
	if (parser)
	{
	    var source = parser.parse(command + "\n",console.log);
		debugInfo(source);
		if (source != "ERROR")
		{
			var fob = new Fob();
			fob.main="main";
			eval.call(fob,source);
		}
	}
}


// String:A>>Console
// (String:A String:B)>>Concatenate>>Console
// ((String:A String:B)>>Concatenate String:C)>>Concatenate>>Console
// this._pipe(this._list(this._pipe(this._list(this._lookup("String:A") ,this._lookup("String:B"))._bind(this._lookup("Concatenate"))) ,this._lookup("String:C"))._bind(this._lookup("Concatenate"))._bind(this._lookup("Console")))._go()
//{"_string":"List","_start":"","_elements":[{"_string":"Concatenate","_start":"","_out_string":{},"_value":"","_in_string_$@":true},{"_string":"String","_start":"","_out_string":{},"_value":"C"}],"bindee":{"_string":"Concatenate","_start":"","_out_string":{},"_value":"","_in_string_$@":true}}