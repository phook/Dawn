const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");
function times()
{
	Resource.call(this,"times"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=timesProcessor;
	return this;
}

function timesProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_go = null;
  this.value = 0;
  this.continueTimes = function()
  {
      let startTime = new Date().getTime();
      while (this.value>0)
      {
        this.value -= 1;
        this.out_go?.();
        let thisTime = new Date().getTime() - startTime;
        if (thisTime>10) //msecs
          return new Promise(()=>{
            this.continueTimes();
          });
      }     
  }
	this.in_Number_$all = function(input)
    {     
      this.value = input.value.valueOf();
      return this.continueTimes();
    }
}
times.Processor=timesProcessor;
module.exports=times;
