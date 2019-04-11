var express = require('express');
var http = require('http');
var path = require('path')
var fs = require('fs')

var hub     = require('./hubserver.js');
var app = express();
var server = http.createServer(app);
var bnft = require("./BNFT.js");

var Fob = require("./dawn/Fob.js");
var Directory = require("./dawn/Directory.js");

//var oldEval = eval;
var globalEval = (function(eval) { return function(code) { return eval(code) } })(eval);

Fob.passedEval = globalEval;
hub.createServer(server,globalEval);

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

Fob.parser = null;
fs.readFile("dawn.bnft", 'utf8', function(err, source) {
  if (err) 
  {
	  console.log("error reading dawn.bnft");
	  throw err;
  }
  Fob.parser = new bnft(source, console.log);
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

Fob.server = server;
Fob.root = new Directory("Root",path.join(__dirname,"dawn"));

Fob.root._add(new Boolean("Boolean"));
Fob.root._add(new If("If"));






//// Scope lookup should pack the normal lookups in this - for the pipe. (so previous methodics go out of Fob - including go from first);
	function _call(pipe, obj,fn)
    {
        this._call = function()
        {
   	 	    var args = Array.prototype.slice.call(arguments);
			args.unshift(pipe);
            fn.apply(obj,args);
        }
    }

Reference = function (resource)
{
	Fob.call(this,"");
    var previous = null;
    this.resource = resource;
    this._set_previous= function(_previous)
    {
        previous = _previous;
    }
    this._get_previous = function(_previous)
    {
        return previous;
    }
    // copy outputs
    for(a in resource)
    {
        // Create pass through functions to _in_ functions
        if (a.indexOf("_in_") == 0)
        {
		    let output=a;
            this[a] = function(...args)
            {
                resource[output](this,...args);
            }
        }
        else
        if (a.indexOf("_out_") == 0)
        {
            this[a] = null;
        }
    }
	this._offer_bind = function(match)
	{
		return resource._offer_bind(match,this);
	}
	this._bind = function(bindee)
	{
		var id = this._type;
		if (typeof(this._value) != "undefined")
			id+=this._value;
		debugInfo(id + " binds("+bindee._type+")");
		bindee._set_previous(this);
		this.bindee = bindee;		

        if (resource._sub_bind)
			resource._sub_bind(this,bindee);

        // bind outputs
		for(a in this)
		{
			if (a.indexOf("_out_") == 0)
			{
				match = a.substr(5);
				if (match.indexOf("_") != -1)
					match = match.substr(0,match.indexOf("_"));
				//debugInfo("trying to bind "+match);

                var input_bound = bindee._offer_bind(match,this)
                
				if (input_bound)
					this[a] = input_bound;
				/*
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
				*/
			}
		}
		return bindee;
	}
    this._go_from_start = function(pipe)
	{
		if (previous)
		{
			var first = previous;
			
			var loopTest = [first];
			
 			while (first._get_previous())
	 		{
 				first = first._get_previous();
			    loopTest.forEach(function(element){
				  if (first == element)
					  throw "circular ref error";
				});
				loopTest.push(first);
			}
			first._in_go(this);
		}
		else
		{
            
		}
	}

}




function dawnCommand(command)
{
    if (command == "exit")
    {
		server.clients.eval("window.close();");
        process.exit(-1);
	}
    if (Fob.parser)
	{
		debugInfo(command);
	    var source = Fob.parser.parse(command + "\n",{alert:console.log, nonterminal:"COMMAND_LINE"});
		debugInfo(source);
		if (source != "ERROR")
		{
			globalEval.call(Fob.root,source);
			console.log(Object.keys(Fob.root._children));
		}
	}
}


// String:A>>Console
// [String:A String:B]>>Concatenate>>Console
// ((String:A String:B)>>Concatenate String:C)>>Concatenate>>Console
// Boolean:true>>If>>String:A>>Console
// this._pipe(this._list(this._pipe(this._list(this._lookup("String:A") ,this._lookup("String:B"))._bind(this._lookup("Concatenate"))) ,this._lookup("String:C"))._bind(this._lookup("Concatenate"))._bind(this._lookup("Console")))._go()
//{"_string":"List","_start":"","_elements":[{"_string":"Concatenate","_start":"","_out_string":{},"_value":"","_in_string_$@":true},{"_string":"String","_start":"","_out_string":{},"_value":"C"}],"bindee":{"_string":"Concatenate","_start":"","_out_string":{},"_value":"","_in_string_$@":true}}