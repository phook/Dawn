function fn(scope) {
scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:this._out_go%20%3D%20null%0D%0A%20%20%20%20this._in_number_%24%20%3D%20function(number)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20%20if%20(this._out_go)%0D%0A%20%20%20%20%20%20%20%7B%20%20%20%20%20%20%20%20%20%20%20%20while%20(number._value.greater(0%2C1))%0D%0A%20%20%20%20%20%20%20%20%20%20%20%20%7B%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20number._value%20%3D%20number._value.subtract(1%2C1)%0D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20this._out_go()%20%20%20%20%20%20%20%20%0D%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%7D%0A%20%20%20%20%7D")._bind(scope._lookup("NewObject:times")))._in_go(scope);

};
module.exports = fn;

