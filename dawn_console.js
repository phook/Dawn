var express = require('express');
var http = require('http');
var path = require('path')
var fs = require('fs')
var fileUpload = require('express-fileupload');

var hub     = require('./hubserver.js');
var app = express();
var server = http.createServer(app);
var bnft = require("./BNFT/BNFT.js");

var Fob = require("./dawn/Fob.js");
var Directory = require("./dawn/Directory.js");
var Reference = require("./dawn/Reference.js");

var bigRat = require("big-rational");

//var oldEval = eval;
var globalEval = (function(eval) { return function(code) { return eval(code) } })(eval);

Fob.bigRat = bigRat;
Fob.passedEval = globalEval;
hub.createServer(server,globalEval);

app.use(express.static('public'));
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
/*
function read_dir(dirpath,jsdir)
{
   files = fs.readdirSync(dirpath);
   files.forEach(function (file) {
        var filepath = path.resolve(dirpath, file); 
        var stat = fs.statSync(filepath);
        if (stat && stat.isDirectory())
        {
            jsdir[file] = read_dir(filepath,{});
        }
    });
   files.forEach(function (file) {
        var filepath = path.resolve(dirpath, file); 
        var stat = fs.statSync(filepath);
        if (stat && !stat.isDirectory())
        {
            jsdir[file] = "file";
        }
    });
    return jsdir;
}

*/

// dir command service - parameters: dir = directory in uri:fileformat, hidden - show hidden files, recursive - recursive directory
app.get('*/_dir', function(request, result) {
    // test for file beginning
    var dir = request.query.dir.replace("file:///","");
    result.send(JSON.stringify(read_dir(dir,request.query.recursive,request.query.hidden)));
});

// file service - get = load, put = save, parameters: file = path to file in uri:fileformat 
app.get('/_file', async (request, result) => {
    try {
        var file = request.query.file;
        // test for file beginning
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

Fob.fileToString = function(filename)
{
    return fs.readFileSync(filename, {option:'utf8', function(err, source) {console.log("error reading "+filename);throw err;}}).toString();
}

Fob.bnft = bnft;
Fob.parser = null;
Fob.parser = new Fob.bnft(Fob.fileToString("dawn/Flavors/dawn.bnft"), console.log);
console.log("dawn parser loaded");

var debug = true;

if (debug)
	fs.writeFile('log.txt', '', function(){});

function debugInfo(s)
{
	if (debug)
		fs.appendFile('log.txt', s+"\n", function(){});
}


Fob.debugInfo = debugInfo;
Fob.server = server;
Fob.root = new Directory("Root",path.join(__dirname,"dawn"));
Fob.root.path.push("Dawn.");

function dawnCommand(command)
{
    if (command == "exit")
    {
		server.clients.eval("window.close();");
        process.exit(-1);
	}
    if (Fob.parser)
	{
		debugInfo("COMMAND:" + command);
		if (command.indexOf("Console") == -1)
			command += ">>Console";
	    var source = Fob.parser.parse(command + "\n",{alert:console.log, nonterminal:"COMMAND_LINE"});
		debugInfo("COMMAND PARSED:" + source);
		if (source != "ERROR")
		{
			globalEval.call(Fob.root,source);
			Fob.debugInfo(Object.keys(Fob.root._children));
		}
	}
}
