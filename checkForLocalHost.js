var dns = require('dns');
var networkInterfaces = require('os').networkInterfaces();

function checkForLocalHost(addressToCheck)
{
  return new Promise((resolve, reject) =>
  {
    dns.lookup(addressToCheck, function(error, address)
    {
      if (err)
      {
        resolve(false);
        return;
      }
      try
      {
        Object.keys(networkInterfaces).forEach(function(interfaceName)
        {
          networkInterfaces[interfaceName].forEach(function(interface)
          {
            if (interface.address === address)
              resolve(true);
          });
        });
        resolve(false);
      }
      catch (error)
      {
        reject(error);
      }
    })
  })
}

module.exports = checkForLocalHost;