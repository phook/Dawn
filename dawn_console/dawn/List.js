function DawnList(name)
{
    var Fob = require("./Fob.js");
	Fob.call(this,name);
	this._elements=[];
	this.bindee = null;
	this._type="List";
	this._bind = function(bindee)
	{
        console.log("list binding");
		for(element in this._elements)
		{
	        this._elements[element]._setprevious(this);
			this._elements[element]._bind(bindee);
		}
	    bindee._setprevious(this);
		this.bindee = bindee;
		return bindee;
	}
	this._add = function()
	{
        console.log("list adding");
		var inputs="";
        var args = Array.prototype.slice.call(arguments);
		var list = this;
        args.forEach(function(element) {
			element._setprevious(list);
            list._elements.push(element);
        });
		return list;
	}
	this._lookup = function()
	{
		return new DawnList();
	}
	this._in_go = function()
	{
        console.log("list going");
		for(element in this._elements)
		{
			this._elements[element]._in_go();
		}
		this.bindee._in_go();
	}
}
module.exports=DawnList;