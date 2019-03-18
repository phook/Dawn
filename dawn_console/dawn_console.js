var express = require('express');
var http = require('http');
var hub     = require('./hubserver.js');
var app = express();
var server = http.createServer(app);
var bnft = require("./BNFT.js");
var fs = require('fs')

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


function dawnCommand(command)
{
	if (parser)
	   console.log(parser.parse(command + "\n",console.log));
}

