var express = require('express');
var http = require('http');
var transformMiddleware = require('express-transform-bare-module-specifiers').default;
//var path = require('path')
var fs = require('fs')
var fileUpload = require('express-fileupload');
var checkForLocalHost = require('./checkForLocalHost.js');

var hub     = require('./hubserver.js');
var app = express();
var server = http.createServer(app);

var Dawn = require("./Dawn.js");

var globalEval = (function(eval) { return function(code) { return eval(code) } })(eval);
Dawn.initialize(__dirname,server,globalEval);




hub.createServer(server, Dawn.passedEval);

app.use(transformMiddleware());
app.use(express.static('public'));
app.use("/node_modules",express.static('node_modules'));
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


server.listen(process.env.PORT || 5000, function () {
})

console.log("dawn parser loaded");




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
			globalEval.call(Dawn.root,source);
			Dawn.debugInfo(Object.keys(Dawn.root._children));
		}
	}
    if (Dawn.returnResult)
        return Dawn.returnResult;
}
