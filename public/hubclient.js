const io = require("socket.io/socket.io");
require("uuid");
exports.createClient = function(optionalClientName)
{
  var Client = function(optionalName) // user needs to make this unique
	{
	  var url = window.location.href;
	  url = url.substring(0,url.lastIndexOf('/'));
	  // connect to server
	  var socket = io.connect(url); // consider pruning href
	  var clientName = "";
	  var returnMap = {};

    var evalOn = function(client, whatToEvaluate, callback)
    {
			if (callback)
				returnMap["#" + client + "#" + whatToEvaluate] = callback;
		  var packet =  JSON.stringify(
			{
				target      : client,
				source      : clientName,
				evaluate    : whatToEvaluate
			});
			socket.emit('evaluate',packet);
			//console.log("sending " + packet);		  
    }
    async function evalOnAsync(client, whatToEvaluate)
    {
		var promise = new Promise(function(resolve, reject) { 
		  returnMap["#" + client + "#" + whatToEvaluate] = resolve;
		});
		  var packet =  JSON.stringify(
			{
				target      : client,
				source      : clientName,
				evaluate    : whatToEvaluate
			});
			socket.emit('evaluate',packet);
		return promise;
    }

    var clientType = function(remoteClientName)
    {
      var name = remoteClientName;
	    this.eval = function(whatToEvaluate,callback)
	    {
	    	evalOn(name,whatToEvaluate,callback);
		  }
    }
	  
	  this.clients = {};

	  this.server = new function()
	  {
	    this.eval = function(whatToEvaluate,callback)
	    {
	      evalOn("server",whatToEvaluate,callback);
		}
	    this.evalAsync = async function(whatToEvaluate)
	    {
	      return evalOnAsync("server",whatToEvaluate);
		}
	  }();

    this.getName = function()
    {
    	return clientName;
    }

    this.setName = function(newName)
    {
  		socket.emit('registerName', clientName + '=' + newName);
      clientName = newName;
	  }

		socket.on('registerName', (nameToRegister) =>
		{
			var names = nameToRegister.split("=");
			if (names[0] !== names[1])
			{
					if (this.clients.hasOwnProperty(names[0]))
						this.clients[names[1]] = this.clients[names[0]];
				  else
					this.clients[names[1]] = new clientType(names[1]);
					if (names[0] !== "")
						this.clients[names[0]] = undefined;
				  //console.log(names[1] + " registered");
			}
		})

		socket.on('result', (packet) =>
		{
			returnValue = JSON.parse(packet);
			//console.log("got result " + packet);
			returnType = typeof(returnMap["#" + returnValue.source + "#" +returnValue.evaluate]);
			if (returnType == "function")
			{
				returnMap["#" + returnValue.source + "#" +returnValue.evaluate](returnValue.returnValue);
				returnMap[returnValue.evaluate] = undefined;
			}
		})

	  socket.on('connect', () =>
	  {
  	  if (typeof(optionalName) === "string")
	      this.setName(optionalName);
	    else
	      this.setName(Math.uuid());
		});

		socket.on('evaluate', (packet) =>
		{
		  //console.log("evaluating "+ packet);
		  whatToEvaluate = JSON.parse(packet);
		  if (whatToEvaluate.target != clientName &&
		      whatToEvaluate.target != "broadcast")
		    return;
			var result="";
			try
			{
				var callback = function(result)
				{
					socket.emit('result', JSON.stringify(
					{
					  target      : whatToEvaluate.source,
					  source      : clientName,
						evaluate    : whatToEvaluate.evaluate,
						returnValue : result
					}));
				}
				result = eval(whatToEvaluate.evaluate);
				if (result !==  "returnValueInCallback")
				  callback(result);
			}
			catch (e)
			{
			}
		});
	}
  return new Client(optionalClientName);
}

