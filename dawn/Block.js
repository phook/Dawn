const Fob = Dawn.require("./dawn/Fob.js");
function DawnBlock()
{
	Fob.call(this,"Block");
	this._pass_bind = function(bindee)
	{
		this._bindee = bindee;
		bindee._set_previous(this);  // VERY IMPORTANT - OVERRIDE SO REWIND DOESENT GO "INTO" LIST
		return bindee;
	}
	this._offer_bind = function(match)
	{
		for(b in this)
		{
			if ((b == "_in_" + match) || (b.indexOf("_in_"+match+"_") == 0))
			{
				if ((b.indexOf("_$")==(b.length-2)) || typeof(this[b+"@"]) == "undefined")
				{
					this[b+"@"] = true;
					return this[b].bind(this);
				}
			}
		}
	}
    this._end_bind = function()
    {
        if (this._bindee)
        {
            if (typeof (this._bindee._elements) != "undefined")
            {
                let elements = this._bindee._elements;
                for(let it=0; it<elements.length-1; i++)
                {
                    elements[it]._bind_go(elements[it+1]);
                }
            }
            else
                console.log("Error: Block Expects List");            
        }
        else
            console.log("Error: Block Expects List");
    }
	this._in_lookup = function()
	{
		return new DawnBlock();
	}
	this._in_begin = function()
	{
		if (this._bindee)
			this._bindee._in_begin();
	}
	this._in_end = function()
	{
		if (this._bindee)
			this._bindee._in_end();
	}
	this._in_go = function(scope)
	{
		if (this._bindee)
			this._bindee._in_go(scope);
	}
}
module.exports=function(scope){scope._add(new DawnBlock());};