const express = require('express');
const compression = require('compression');
const http = require('http');
const transformMiddleware = require('express-transform-bare-module-specifiers').default;
const path = require('path')
const fs = require('fs')
const fileUpload = require('express-fileupload');
const checkForLocalHost = require('./checkForLocalHost.js');

const hub     = require('./hubserver.js');
var app = express();
var server = http.createServer(app);
app.use(compression());

let Dawn = require("./Dawn.js");
let DawnCompiler = require("./DawnCompiler.js");

var globalEval = (function(eval) { return function(code) { return eval(code) } })(eval);


//var Directory = require("./dawn/Directory.js");
//var root = new Directory("Root",path.join(__dirname,"/dawn"));
//root.path.push("Dawn.");
Dawn.initialize("./dawn",globalEval);
Dawn.server = server; // NOT SERVER BUT OUTPUT FUNCTION - SO IT CAN WORK IN BROWSER AS WELL - MAYBE IN INIT


hub.createServer(server, globalEval);

app.use(transformMiddleware());

app.use(function (request, result, next) {
  let { url } = request;
  if (url.indexOf("/*") !== -1)
  {
    console.log(url);
    if (url.indexOf("/dawn") !== 0)
        url = "\\public" + url;
    var dir = __dirname + url.replace("*","");
    result.send(JSON.stringify(read_dir(dir,request.query.recursive,request.query.hidden)));
  }
  else
    next()
})


app.use(express.static('public'));
app.use("/node_modules",express.static('node_modules'));
app.use("/dawn",express.static('dawn'));
app.use("/Dawn.js",express.static('Dawn.js'));
app.use("/BigInt_BigRat.min.js",express.static('BigInt_BigRat.min.js'));
app.use("/BNFT",express.static('BNFT'));
app.use("/uil",express.static('uil'));
app.use(fileUpload());



// CAN BE USED FOR MONITORING CHANGES - FILES HAS TIMESTAMP - 
function read_dir(dirpath,recursion,hidden)
{
   var jsdir = {};
   files = fs.readdirSync(dirpath)
   files.forEach(function (file) {
        filepath = path.resolve(dirpath, file);
        if(! /^\./.test(file) || hidden)
        try {
            var stat = fs.statSync(filepath);
            if (stat && stat.isDirectory())
            {
                if (recursion)
                    jsdir[file] = read_dir(filepath,{});
                else
                    jsdir[file] = {};
            }
            else
            {
                jsdir[file] = stat.mtime;
            }
        } catch (e) {
        }
    });
    return jsdir;
}
/* Set Time or file - use to sync .dawn with .dawn_flavors (.flavor files should only be saved when errors are in them)
var fs = require('fs')
function setFileTime(filePath, atime, mtime) {
    fs.utimesSync(filePath, atime, mtime);
}
var date = new Date('Thu Aug 20 2015 15:10:36 GMT+0800 (CST)');
setFileTime('/tmp/scache/fdf/admin.log', date, date);
*/


// dir command service - parameters: dir = directory in uri:fileformat, hidden - show hidden files, recursive - recursive directory
app.get('*/_dir', function(request, result) {
    // test for file beginning
    var dir = request.query.dir.replace("file:///","");
    
    /* ADD USERS RIGHTS TO HEADER - NOT LOGGED IN IS READONLY */
    
    result.send(JSON.stringify(read_dir(dir,request.query.recursive,request.query.hidden)));
});

// file service - get = load, put = save, parameters: file = path to file in uri:fileformat 
app.get('/_file', async (request, result) => {
    try {
        var file = request.query.file;
        // test for file beginning

    /* ADD USERS RIGHTS TO HEADER - NOT LOGGED IN IS READONLY */

        file = file.replace("file:///","");
        fs.readFile(file, function (err,data) {
            if (err) {
              result.writeHead(404);
              result.end(JSON.stringify(err));
              return;
            }
            result.writeHead(200);
            result.end(data);
        });        
    } catch (err) {
        result.status(500).send(err);
    }
});

app.put('/_file', async (request, result) => {
    try {
        if (!checkForLocalHost(request.headers.host))
        {
            result.status(403).send(err);
            return;
        }            
        var file = request.query.file;
        // test for file beginning
        file = file.replace("file:///","");
        if(!request.files) {
            result.send({
                status: false,
                message: 'No file'
            });
        } else {
            let file = request.files.file;
            
            // delete the one there?
            file.mv(file);

            result.send({
                status: true,
                message: 'File is saved',
            });
        }
    } catch (err) {
        result.status(500).send(err);
    }
});


// LAST CATCH ALL CONT SEND 404, send 204 - prevent 404 errors in debugging
app.use(function (req, res, next) {
  res.status(204).send()
})

server.listen(process.env.PORT || 5000, function () {
})

console.log("dawn parser loaded");



/*
function dawnCommand(command)
{
    Dawn.returnResult = null;
    if (command == "exit")
    {
		server.clients.eval("window.close();");
        process.exit(-1);
	}
    if (Dawn.parser)
	{
		Dawn.debugInfo("COMMAND:" + command);
		if (command.indexOf("Console") == -1)
			command += ">>Console";
	    var source = Dawn.parser.parse(command + "\n",{alert:console.log, nonterminal:"COMMAND_LINE"});
		Dawn.debugInfo("COMMAND PARSED:" + source);
		if (source != "ERROR")
		{
			//globalEval.call(Dawn.root,source);
            var evalInContext = function(str){
                return eval(str);
            };
            Dawn.print = function(string)
            {
                if (!Dawn.returnResult)
                    Dawn.returnResult = "";

                Dawn.returnResult += string + "\n";
            }
			evalInContext.call(Dawn.root,source);

			Dawn.debugInfo(Object.keys(Dawn.root._children));
		}        
	}
    if (Dawn.returnResult)
        return Dawn.returnResult;
}
*/

function dawnCommand(command)
{
    Dawn.returnResult = null;
    if (command == "exit")
    {
		server.clients.eval("window.close();");
        process.exit(-1);
	}
    if (Dawn.parser)
	{
		Dawn.debugInfo("COMMAND:" + command);
		if (command.indexOf("Console:") == -1)
			command += ">>Console:";
		let jsSource = (new DawnCompiler).parse(command);

		console.log("COMMAND PARSED:" + command +" " + jsSource);
		if (jsSource != "ERROR")
		{
			function evalInContext(js, context) {
			  return function() {
				return eval(js);
			  }.call(context);
			}

			Dawn.print = function(string)
            {
                if (!Dawn.returnResult)
                    Dawn.returnResult = "";

                Dawn.returnResult += string + "\n";
            }

			let program_lines = evalInContext(jsSource,Dawn);
			let processor = Dawn._instanciate_processor();
			processor._execute(processor,program_lines);

		}        
	}
    if (Dawn.returnResult)
        return Dawn.returnResult;
}
