function fn(scope) {
scope._lookup("NewObject:Number")._in_go(scope);
scope._lookup("Pipe:")._add(scope._lookup("List:")._add(scope._lookup("NewOutput:number") ,scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:this._value%20%3D%20number._value%3B")._bind(scope._lookup("NewInput:number_$"))) ,scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:if%20(this._out_number)%0D%0A%20%20%20%20%20%20%7B%20%20%20%20%20%20%20%20this._out_number(this)%3B%0D%0A%20%20%20%20%20%20%7D")._bind(scope._lookup("NewInput:go"))) ,scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:var%20newObject%3D%20this._clone()%3B%0D%0A%20%20%20%20%20%20%20%20%20newObject._value%3Dnew%20Dawn.bigRat(lookup_child._value)%3B%0D%0A%20%20%20%20%20%20%20%20%20return%20newObject%3B")._bind(scope._lookup("NewInput:lookup_child"))))._bind(scope._lookup("Number")))._in_go(scope);

};
module.exports = fn;

