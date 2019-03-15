var express = require('express');
var http = require('http');
var hub     = require('./hubserver.js');
var app = express();
var server = http.createServer(app);

hub.createServer(server);

app.use(express.static('public'));

server.listen(5000, function () {
})
