const Resource = Dawn.require('./dawn/Resource.js');

// THIS IS THE DATA HOLDER - MAPPING TO NATIVE TYPE - IN THIS CASE A JAVASCRIPT NUMBER
function _Number()
{
    Resource.call(this,"Number"); // REMOVE NAMING - BUT LEAVE FOR DEBUG FOR NOW
    this.Processor = _NumberProcessor;
}

// THIS IS THE PROCESSOR ASSOCIATED WITH NUMBER - EVERY FLOW ACCESSING NUMBER MUST INSTANCIATE ON OF THESE TO OPERATE ON THE VALUE
// SINCE NUMBER IS AN OBJECT, MULTIPLE PROCESSORS FOR THE DATA CAN BE CREATED, EACH POINTING TO THE ORIGINAL PIECE OF DATA
function _NumberProcessor(resource)
{
  Resource.Processor.call(this,resource); 
	this._resource = resource;
	this._out_Number = null;
  this._in_Number_$ = function(input)
  {   
      this._get_resource()._value = number._value;
  }
  this._in_go = function()
  {
      return this?._out_Number(resource);
  }
  this._in_instanciate = function(input)
  {   
    let newObject=this._get_resource()._clone();
    let val = input._value;
    let hashpos= val.indexOf("#");
    if (hashpos != -1)
    {
        let calcval=new Dawn.bigRat(0);
        let divider=new Dawn.bigRat(0);
        let multiplier = new Dawn.bigRat(1);
        let base = parseInt(val.substr(hashpos+1));
        if (isNaN(base))
        {
          // raise error
        }
        val = val.substr(0,hashpos).toUpperCase() + "_";
        if (base<2 || base>16)
        {
          // raise error
        }
        base = new Dawn.bigRat(base);
        for(let x=0; x<val.length; x++)
        {
          let ch = val[x];
          let nx = val[x+1];
          if (ch == "E" && (nx=="+" || nx=="-"))
          {
            let exp = parseInt(val.substr(x+2));
            if (isNaN(exp))
            {
              // raise error
            }
            multiplier = base.pow(new Dawn.bigRat(exp)); 
            val="";
          }
          if ("0123456789ABCDEF".indexOf(ch) != -1 && "0123456789ABCDEF".indexOf(ch) < base)
          {
            calcval = calcval.multiply(base).add("0123456789ABCDEF".indexOf(ch));
            divider = divider.multiply(base);
          }
          else
          if ("." == ch)
            divider = new Dawn.bigRat(1);
          else
          if ("_" !== ch || "," !== ch)
          {
            // raise error
          }
        }
        if (divider.compare(0)!==0)  
            calcval = calcval.divide(divider);
        newObject._value=calcval.multiply(multiplier);
    }
    else
        newObject._value=new Dawn.bigRat(input._value);

    return newObject._instanciate_processor();
  }
}  
_Number.Processor=_NumberProcessor;
module.exports=_Number;
