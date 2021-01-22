function fn(scope) {
scope._lookup("NewObject:String")._in_go(scope);
scope._lookup("Pipe:")._add(scope._lookup("List:")._add(scope._lookup("NewOutput:string") ,scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:self._value%20%3D%20string._value%3B")._bind(scope._lookup("NewInput:string_$"))) ,scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:if%20(this._out_string)%0D%0A%20%20%20%20%20%20%7B%20%20%20%20%20%20%20%20this._out_string(this)%3B%0D%0A%20%20%20%20%20%20%7D")._bind(scope._lookup("NewInput:go"))) ,scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:var%20newObject%20%3D%20this._clone()%3B%0D%0A%20%20%20%20%20%20%20%20%20return%20Object.assign(%7B_value%3AdecodeURIComponent(lookup_child._value)%7D%2CnewObject)%3B")._bind(scope._lookup("NewInput:lookup_child"))))._bind(scope._lookup("String")))._in_go(scope);

};
module.exports = fn;

