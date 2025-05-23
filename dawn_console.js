const express = require('express');
//const compression = require('compression');
const http = require('http');
//const transformMiddleware = require('express-transform-bare-module-specifiers').default;
const path = require('path')
const os = require('os')
const fs = require('fs')
const fileUpload = require('express-fileupload');
const checkForLocalHost = require('./checkForLocalHost.js');
const hub     = require('./hubserver.js');
const app = express();
const server = http.createServer(app);
const cors = require('cors');
app.use(cors());

//app.use(compression());

let Dawn = require("./public/dawn.js");
let DawnCompiler = require("./dawn/DawnCompiler.dawn.js");

var globalEval = (function(eval) { return function(code) { return eval(code) } })(eval);

const mime = require('mime-kind');
const { createReadStream } = require('fs');

async function read_dir(dirpath, hidden) {
    let jsdir = {};
    let fdat = {
      mimetype : "",
      size     : 0,
      time     : 0
    }    
    files = fs.readdirSync(dirpath)
    for(fileno in files)
    {
        let file = files[fileno];
        filepath = path.resolve(dirpath, file);
        if (!/^\./.test(file) || hidden)
            try {
                if (file.endsWith(".dawn")) // if there is a dawn file there is a dawn source editable and an executable
                {
                  jsdir[file] = Object.assign({},fdat);
                  jsdir[file].mimetype = "text/dawn";
                  file = file.replace(".dawn","");
                  jsdir[file] = Object.assign({},fdat);
                  jsdir[file].mimetype = "application/dawn";
                }
                else
                if (file.endsWith(".dawn.js")) // if there is a dawn.js file there is an executable
                {
                  file = file.replace(".dawn.js","");
                  jsdir[file] = Object.assign({},fdat);
                  jsdir[file].mimetype = "application/dawn";
                }
                else
                {
                  var stat = fs.statSync(filepath);
                  if (stat && stat.isDirectory() && typeof(jsdir[file]) == "undefined") {
                    jsdir[file] = Object.assign({},fdat);
                    jsdir[file].mimetype = "text/directory-json";
                    jsdir[file].size     = stat.size;
                    jsdir[file].time     = stat.mtimeMs;
                  } 
                  else 
                  {
                    jsdir[file] = Object.assign({},fdat);
                    let extension = path.extname(filepath);
                    if (extension === "") // a file with no extension needs "." to be distinguised from dawn objects
                      file +=".";
                    let mimetype="text/uil";
                    if (extension !== ".uil")
                    {
                      mimetype = (await mime(createReadStream(filepath), extension)).mime;
                      if (!mimetype)
                        mimetype = "binary/" + extension.replace(".","");
                    }
                    jsdir[file].mimetype = mimetype;
                    jsdir[file].size     = stat.size;
                    jsdir[file].time     = stat.mtimeMs;
                  }
                }
            } catch (e) {}
    }
    return jsdir;
}



/////// serve /file/ for file protocol
/////// serve /dawnpath/ for dawnpath
/////// serve /userroot/ for user root
/////// serve / for /public
/////// serve hub clients for multiple remotes - threading should not be necessary


//var Directory = require("./dawn/Directory.js");
//var root = new Directory("Root",path.join(__dirname,"/dawn"));
//root.path.push("Dawn.");
//Dawn.initialize("./dawn",globalEval);
//Dawn.server = server; // NOT SERVER BUT OUTPUT FUNCTION - SO IT CAN WORK IN BROWSER AS WELL - MAYBE IN INIT


hub.createServer(server, globalEval);

//app.use(transformMiddleware());
/*
app.head("*",async function (request, result, next) {
  let { url } = request;
  console.log(request.method);
  if (url.indexOf("/file:///") === 0 && request.hostname === "localhost")
  {
    filepath = url.replace("/file:///","");
    try {
      let stats = fs.statSync(filepath);
      if (stats.isDirectory())
      {
        result.status(200).setHeader("Content-Type","text/directory-json").send();
      }
      else
      if (stats.isFile())
      {
        let extension = path.extname(filepath);
        let mimetype = ""
        if (extension == ".dawn")
            mimetype = "text/dawn";
        else
        {
          let defaultmimetype = await mime(extension);
          let mimeresult = (await mime(createReadStream(filepath), defaultmimetype))

          if (mimeresult)
            mimetype = mimeresult.mime;
          else
            mimetype = "file/" + extension.substring(1);
        }
        result.status(200).setHeader("Content-Type",mimetype).send();      
      }
    }
    catch (exception)
    {
      result.status(204).send();
    }
  }
  else
    next();
});
*/

let environment = 
{
  "dawnPath" : ("file:///"+__dirname+"/dawn").replaceAll("\\","/"),
  "userPath" : "file:///"+os.homedir().replaceAll("\\","/")
}


app.get("*",async function (request, result, next) {
  let { url } = request;
  if (url==="/environment.json" /*&& request.hostname === "localhost"*/)
  {
     result.status(200).setHeader("Content-Type","text/json").send(JSON.stringify(environment));
  }
  else
  if (url.indexOf("/file:///") === 0 /*&& request.hostname === "localhost"*/)
  {
    filepath = url.replace("/file:///","");
    try {
      // Check for missing directory for a dawn file - return empty dir instead of 404
      if (path.extname(filepath) === "" && !fs.existsSync(filepath) && fs.existsSync(filepath + ".dawn.js")) 
      {
        result.status(200).setHeader("Content-Type","text/directory-json").send("{}");
        return;
      }
      let stats = fs.statSync(filepath);
      if (stats && stats.isDirectory())
      {
        let dir = await read_dir(filepath,request.query.hidden);
        result.status(200).setHeader("Content-Type","text/directory-json").send(JSON.stringify(dir));
      }
      else
      if (stats && stats.isFile())
      {
        filepath = path.resolve(filepath);
        console.log(filepath);
        let extension = path.extname(filepath);
        let mimetype = ""
        if (extension == ".dawn")
            mimetype = "text/dawn";
        else
        if (filepath.endsWith(".dawn.js"))
            mimetype = "application/dawn";
        else
        {
          let defaultmimetype = await mime(extension);
          let mimeresult = (await mime(createReadStream(filepath), defaultmimetype))

          if (mimeresult)
            mimetype = mimeresult.mime;
          else
            mimetype = "file/" + extension.substring(1);
        }
        try {
          result.status(200).setHeader("Content-Type",mimetype).sendFile(filepath);      
        } catch (ex) {console.log("sendfile problem" + ex);}
      }
      else
        result.status(404).send(""); 
    }
    catch (exception)
    {
      result.status(404).send(exception);
    }
  }
  else
    next();
});




app.use(express.static('public'));







/* Set Time or file - use to sync .dawn with .dawn_flavors (.flavor files should only be saved when errors are in them)
var fs = require('fs')
function setFileTime(filePath, atime, mtime) {
    fs.utimesSync(filePath, atime, mtime);
}
var date = new Date('Thu Aug 20 2015 15:10:36 GMT+0800 (CST)');
setFileTime('/tmp/scache/fdf/admin.log', date, date);
*/


/*
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
*/

// LAST CATCH ALL CONT SEND 404, send 204 - prevent 404 errors in debugging
app.use(function (req, res, next) {
  res.status(204).send()
})

server.listen(process.env.PORT || 5000, function () {
})




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

		let processor = Dawn._instanciate_processor();
		let program_lines = evalInContext("["+jsSource+"]",processor);
		processor._execute(processor,program_lines);

	}        
    if (Dawn.returnResult)
        return Dawn.returnResult;
}
