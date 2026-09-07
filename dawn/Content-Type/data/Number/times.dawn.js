const Resource  = Dawn.require("Content-Type/data/Resource");
const Number    = Dawn.require("Content-Type/data/Number");
function times()
{
  this.Number = new Number();
	Resource.call(this,"times"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
	this.Processor=timesProcessor;
	return this;
}

function timesProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_go = null;
	this.out_Number = null; // iteration index 0..n-1, emitted alongside out_go
  this.value = 0;
  this.index = 0;
  this.continueTimes = function()
  {
      let startTime = new Date().getTime();
      while (this.value>0)
      {
        this.value -= 1;
        this.out_go?.();
        this.out_Number?.({value:resource.Number.bigRat(this.index)});
        this.index += 1;
        let thisTime = new Date().getTime() - startTime;
        if (thisTime>10) //msecs
          return new Promise((resolve)=>{
            setTimeout(() => {resolve();},0);
          }).then(()=>{this.continueTimes();});;
      }     
  }
	this.in_Number_$all = function(input)
    {     
      this.value = input.value.valueOf();
      this.index = 0;
      return this.continueTimes();
    }
}
times.Processor=timesProcessor;
module.exports=times;