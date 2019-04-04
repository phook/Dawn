var express = require('express');
var http = require('http');
var path = require('path')
var fs = require('fs')

var hub     = require('./hubserver.js');
var app = express();
var server = http.createServer(app);
var bnft = require("./BNFT.js");

var Fob = require("./dawn/Fob.js");

var oldEval = eval;
eval = (function(eval) { return function(code) { return eval(code) } })(eval);

hub.createServer(server);

app.use(express.static('public'));

server.listen(5000, function () {
})

// Sorts keys in "dawn" order - where matching starts of string results in the longer being on top
function dawnSort(a,b)
{ 
    if (b.indexOf(a) == 0)
    {
        return 1;
    }
    if (a.indexOf(b) == 0)
    {
        return -1;
    }
    return a>b?1:-1;
}

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

var debug = true;
function debugInfo(s)
{
	  if (debug)
		  console.log(s);
}


/// Explicitly load Fob from dawn_root
/// Explicitly load Dir from dawn_root and make it Root
/// 'replace' Fob with reloaded value if needed
/// how to boot from svn etc. - need local system to bootstrap remote func (optional local_dawn_root?) 
/// unless its possible to get a precompiled loader from remote dawn installation?

// var pwd = __dirname


function File(name)
{
    name = name.replace(".js","");
    Fob.call(this,name);
    this._type="File";
    this._get_qualified_name = function()
    {
        if (this._previous)
            return this._previous._get_qualified_name() + "/" + this._name;
        return this._name;
    }
	this._lookup = function(identifier)
	{
        if (identifier.indexOf(this._name) == 0)
        {
            // load, add to pool, call _lookup and return if result
            var loaded_object_constructor = require(this._get_qualified_name() + ".js");
            var loaded_object = new loaded_object_constructor(); // create initial instance
            loaded_object     = new loaded_object_constructor(loaded_object._type);  // then create real named for the typename
            loaded_object._name = loaded_object._type;//or is it _type - they should merge into the same at some stage
            _Dawn_Root._add(loaded_object); // and register - replace FileObject - should it do this
//            if (name === identifier)
//                   return loaded_object; // do not return the original prototype - allow it to instance (possible use lookup)
            return new loaded_object_constructor(identifier);
        }
    }
}

function Directory(name, path_to_directory)
{
    Fob.call(this,name);
    this._type="Directory";
    var self = this;
    fs.readdir(path_to_directory, function (err, files) {
        // add directories too - maybe late lookup?
        files.forEach(function (file) {
            if (file.indexOf(".js") !== -1)
            { 
              debugInfo("adding "+file);
              var newFile = new File(file);
              self._add(newFile);
            }
        });
    });

    this._get_qualified_name = function()
    {
        return path_to_directory;
//        return "file://" + path_to_directory.replace(/\\/g,"/").replace(":","|"); // correct url
    }
   
}

/*
const directoryPath = path.join(__dirname, 'dawn');

fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file
        console.log(file); 
    });
});
*/


/*
  DAWNSORT: puts AppleFoo IN FRONT OF Apple since AppleFoo needs to be offered first in case of indexOf match

  array.sort(function(a,b)
  { 
    if (b.indexOf(a) == 0)
    {
  		return 1;
    }
    if (a.indexOf(b) == 0)
    {
  		return -1;
    }
    return a>b?1:-1;
  }
*/



/// MAYBE LIST AND PIPE IS NOT NECESSARY - ROLL FUNC INTO FOB?
/*
function Fob(name)
{
	this._name = name;
	this._type="Fob";
	this._it = 0;
	this._children = {};
	this._previous = null;
    this._add=function()
	{
        var args = Array.prototype.slice.call(arguments);
		var owner = this;
        args.forEach(function(child) {
			child._setprevious(owner);
			var name = "";
			if (child._name)
				name = child._name;
			else
				name = "Ix" + owner._it++;
			console.log("adding " + name);
            owner._children[name] = child;
        });
		return this;
	}
	this._setprevious = function(previous)
	{
		this._previous = previous;
	}
	this._lookup = function(identifier)
	{
		debugInfo("lookup(" + identifier +")");
		for(id in this._children)
		{
     		debugInfo("looking at " + id);
			if (identifier.indexOf(id) == 0)
			{
				var offerResult = this._children[id]._lookup(identifier);
				if (offerResult)
					return offerResult;
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
		bindee._setprevious(this);
		this.bindee = bindee;
		

        // bind outputs
		for(a in this)
		{
			if (a.indexOf("_out_") == 0)
			{
				match = a.substr(5);
				if (match.indexOf("_") != -1)
					match = match.substr(0,match.indexOf("_"));
				//debugInfo("trying to bind "+match);
				for(b in bindee)
				{
					//debugInfo("checking "+b+" = _in_" + match);
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

		// bind children
		for(child in this._children)
		{
	        this._children[child]._setprevious(this);
			this._children[child]._bind(bindee);
		}
		
		return bindee;
	}
	this._in_go = function()
	{
    	debugInfo("fob go called");
		for(element in this._elements)
		{
			debugInfo("running element in list");
			this._elements[element]._go();
		}
		if (this.bindee)
			this.bindee._go();
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
			first._in_go();
		}
		else
		{
		}
	}
	return this;
}



function Pipe(name)
{
	// THE POINT OF PIPE IS TO BREAK THE BACKCHAIN, SO GO EXECUTES FROM START OF PIPE
	Fob.call(this,name);
	this._type="Pipe";
	this._element=null;
	this._bind = function(bindee)
	{
		debugInfo("Pipe binds to " + bindee._type);
		if (this._element)
			this._element._bind(bindee);
		return bindee;
	}
	this._add = function(element)
	{
		this._element=element;
		return this;
	}
	this._lookup = function()
	{
		return new Pipe();
	}
	this._in_go = function()
	{
		debugInfo("pipe go called");
		if (this._element)
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
	this._add = function()
	{
		var inputs="";
        var args = Array.prototype.slice.call(arguments);
		var list = this;
		debugInfo("adding "+ args.toString() +" to " + this._type);
        args.forEach(function(element) {
			element._setprevious(list);
            list._elements.push(element);
        });
		return list;
	}
	this._lookup = function()
	{
		return new List();
	}
	this._in_go = function()
	{
		debugInfo("list go called");
		for(element in this._elements)
		{
			debugInfo("running element in list");
			this._elements[element]._in_go();
		}
		this.bindee._in_go();
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
	this._lookup = function(value)
	{
		debugInfo("returning new String");
		var newString = new String();
		newString._value = value.substring(7);
		return newString;
	}
	this._in_go = function()
	{
		debugInfo("string go called out="+this._value);
		if (this._out_string)
		{
			this._out_string._call(this);
		}
	}
}
*/
function BooleanValue(string)
{
	if (string == "1" ||
	    string.toLowerCase() == "true" ||
 	    string.toLowerCase() == "on")
		return true;
	return false;
}

function Boolean(name)
{
	Fob.call(this,name);
	this._type="Boolean";
	this._out_boolean = null;
	if (name)
    	this._value=BooleanValue(name.substring(8));
	else
		this._value=false;
	this._lookup = function(value)
	{
		debugInfo("returning new Boolean");
		var newBoolean = new Boolean();
		newBoolean._value = BooleanValue(value.substring(8));
     	debugInfo("bool is value "+ newBoolean._value);
		return newBoolean;
	}
	this._in_go = function()
	{
		debugInfo("boolean go called out="+this._value);
		if (this._out_boolean)
		{
			this._out_boolean._call(this);
		}
	}
}

function If(name)
{
	Fob.call(this,name);
	this._type="If";
	this._out_go_true = null;
	this._out_go_false = null;
	this._lookup = function(value)
	{
		debugInfo("returning new If");
		return new If();
	}
	this._in_boolean = function(b)
	{
		// NATIVE BEGIN
		debugInfo("If " + b._value);
		if (b._value)
		{
			if (this._out_go_true)
				this._out_go_true._call();
		}
		else
			if (this._out_go_false)
				this._out_go_false._call()
	    // NATIVE END
	}
}
/*
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
	this._lookup = function()
	{
		debugInfo("returning new Concatenate");
		return new Concatenate();
	}
	this._in_go = function()
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
	this._lookup = function()
	{
		return new Console();
	}
	this._in_string = function(s)
	{
		// NATIVE BEGIN
		var do_eval = "print(\"" + s._value + "\")"
		debugInfo(do_eval);
		server.clients.eval(do_eval);
		// NATIVE END
	}
}
*/
var _Dawn_Root = new Directory("Directory",path.join(__dirname,"dawn")); 

Fob.server = server;
/*
_Dawn_Root._add(new String("String"));
_Dawn_Root._add(new Boolean("Boolean"));
_Dawn_Root._add(new Concatenate("Concatenate"));
_Dawn_Root._add(new Console("Console"));
_Dawn_Root._add(new List("List"));
//_Dawn_Root._add(new Pipe("Pipe"));
_Dawn_Root._add(new If("If"));
*/

function dawnCommand(command)
{
    if (command == "exit")
    {
		server.clients.eval("window.close();");
        process.exit(-1);
	}
    if (parser)
	{
		debugInfo(command);
	    var source = parser.parse(command + "\n",console.log);
		debugInfo(source);
		if (source != "ERROR")
		{
			eval.call(_Dawn_Root,source);
		}
	}
}


// String:A>>Console
// (String:A String:B)>>Concatenate>>Console
// ((String:A String:B)>>Concatenate String:C)>>Concatenate>>Console
// Boolean:true>>If>>String:A>>Console
// this._pipe(this._list(this._pipe(this._list(this._lookup("String:A") ,this._lookup("String:B"))._bind(this._lookup("Concatenate"))) ,this._lookup("String:C"))._bind(this._lookup("Concatenate"))._bind(this._lookup("Console")))._go()
//{"_string":"List","_start":"","_elements":[{"_string":"Concatenate","_start":"","_out_string":{},"_value":"","_in_string_$@":true},{"_string":"String","_start":"","_out_string":{},"_value":"C"}],"bindee":{"_string":"Concatenate","_start":"","_out_string":{},"_value":"","_in_string_$@":true}}