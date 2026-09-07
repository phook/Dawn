const Resource  = Dawn.require("Content-Type/data/Resource");

// Splits Strings at given positions: [String:abcdef Number:2 Number:4]>>String.split:
// emits "ab", "cd", "ef". Positions are absolute indices (cut points),
// clamped to the string, deduplicated and applied in ascending order.
function split()
{
	Resource.call(this,"split");
	this.Processor=splitProcessor;
	return this;
}

function splitProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this.resource = resource;
	this.out_String = null;
	this.in_begin = function()
	{
		this.subjects = [];
		this.positions = [];
		return this.fire_end_parameters(); // pre-positioned parameter inputs
    }
    function addPosition(input)
    {
		this.positions.push(Math.floor(input.value.valueOf()));
    }
	this.in_Number_position = addPosition;
	this.in_Number_$all = addPosition;
	this.in_String_$all = function(input)
    {
		this.subjects.push(input.value);
    }
	this.in_end = function()
    {
		let positions = [...new Set(this.positions)].sort((a,b)=>a-b);
		for (let i in this.subjects)
		{
			let s = this.subjects[i];
			let cuts = positions.filter(p => p>0 && p<s.length);
			let prev = 0;
			for (let j in cuts)
			{
				this?.out_String?.({value:s.substring(prev, cuts[j])});
				prev = cuts[j];
			}
			this?.out_String?.({value:s.substring(prev)});
		}
    }
}
split.Processor=splitProcessor;
module.exports=split;