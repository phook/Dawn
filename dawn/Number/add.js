function fn(scope) {
scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:this._out_number%20%3D%20null%3B%0D%0A%20%20%20%20this._in_begin%20%3D%20function()%0D%0A%20%20%20%20%7B%20%20%20%20%20%20this._value%20%3D%20new%20Dawn.bigRat(0%2C0)%3B%0D%0A%20%20%20%20%7D%0A%20%20%20%20this._in_go%20%3D%20function()%0D%0A%20%20%20%20%7B%20%20%20%20%20%20if%20(this._out_number)%0D%0A%20%20%20%20%20%20%7B%20%20%20%20%20%20%20%20this._out_number(this)%3B%0D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%20%20this._in_number_%24%20%3D%20function(number)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20this._value%20%3D%20this._value.add(number._value)%3B%0D%0A%20%20%20%20%7D")._bind(scope._lookup("NewObject:add")))._in_go(scope);

};
module.exports = fn;

