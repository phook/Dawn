const Resource = Dawn.require('./dawn/Resource.js');

function _loop()
{
	Resource.call(this,"loop");
	this.Processor=loopProcessor;
	return this;
}

// NEED TO WORK WITH A BREAK FUNCTION 

function loopProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_go = null;
	this._in_go = function()
  {
      if (typeof(this._out_go) == "undefined")
        return;
      while (true)
      {
        // HERE TIMER TEST FOR OTHER STUFF TO RUN - RETURNING TIMED PROMISE THAT RUNS IMMEDIATELY
        let result = this._out_go();
        if (result)
        {
          // when promise resolves continue loop
          return result.promise().then(function()
          {
            this._in_go();
          });
        }
      }
  }
}
_loop.Processor=loopProcessor;
module.exports=_loop;
