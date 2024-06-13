const Resource = Dawn.require('./dawn/Resource.js');
function Holder()
{
    Resource.call(this,"Holder");
    this._isHolder=true;
    this._bind = function(bindee)
    {
        this._bindee=bindee;
        return this;
    }
    this._add = function(lookup)
    {
        this._lookup=lookup;
        return this;
    }
}
module.exports=Holder;
