var Socket = require('socket.io');
exports.createServer = function(server, passedEval)
{

  // listen with socket.io
  var io = Socket.listen(server);
  io.set("origins", "*:*");

  var returnMap = {};
  server.clients = {};

  server.clients.eval = function(whatToEvaluate)
  {
    var packet = JSON.stringify(
    {
      target: "broadcast",
      evaluate: whatToEvaluate
    });
    io.sockets.emit('evaluate', packet);
  }

  io.sockets.on('connection', (socket) =>
  {
    socket.eval = function(whatToEvaluate, callback)
    {
      if (callback)
        returnMap["#" + client + "#" + whatToEvaluate] = callback;
      var packet = JSON.stringify(
      {
        target: socket.name,
        source: "server",
        evaluate: whatToEvaluate
      });
      socket.emit('evaluate', packet);
      //console.log("sending " + packet);		  
    }
    //console.log("connection");
    socket.on('evaluate', (packet) =>
    {
      whatToEvaluate = JSON.parse(packet);
      if (whatToEvaluate.target !== "server")
      {
        if (typeof(server.clients[whatToEvaluate.target]) != "undefined")
        {
          //console.log("relaying " + packet);
          server.clients[whatToEvaluate.target].emit("evaluate", packet);
        }
      }
      else
      {
        //   			  console.log("evaling " + packet);
        try
        {
          callback = function(result)
          {
            var evalResult = JSON.stringify(
            {
              target: whatToEvaluate.source,
              source: "server",
              evaluate: whatToEvaluate.evaluate,
              returnValue: result
            });
            if (typeof(server.clients[whatToEvaluate.source]) != "undefined")
            {
              //console.log("returning " + evalResult);
              server.clients[whatToEvaluate.source].emit("result", evalResult);
            }
          }
          var result = passedEval(whatToEvaluate.evaluate);
          if (result != "returnValueInCallback")
            callback(result);
        }
        catch (e)
        {
          console.log(e);
        }
      }
    });
    socket.on('registerName', (nameToRegister) =>
    {
      var names = nameToRegister.split("=");
      if (names[0] !== names[1])
      {
        if (server.clients.hasOwnProperty(names[0]))
          server.clients[names[1]] = server.clients[names[0]];
        else
        {
          for (var i in server.clients)
            socket.emit("registerName", "=" + i);
          server.clients[names[1]] = socket;
        }
        socket.name = names[1];
        if (names[0] !== "")
          server.clients[names[0]] = undefined;
        console.log(names[1] + " registered");
        io.sockets.emit("registerName", nameToRegister);
      }
    });
    socket.on('result', function(packet)
    {
      returnValue = JSON.parse(packet);
      if (returnValue.target === "server")
      {
        if (typeof(returnMap[returnValue.evaluate]) != "undefined")
        {
          returnMap[returnValue.evaluate](returnValue.returnValue);
          returnMap[returnValue.evaluate] = undefined;
        }
      }
      else
      {
        if (typeof(server.clients[returnValue.target]) != "undefined")
        {
          server.clients[returnValue.target].emit(packet);
        }
      }
    });
  });
}