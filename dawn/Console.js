function fn(scope) {
scope._lookup("NewObject:Console")._in_go(scope);
scope._lookup("Pipe:")._add(scope._lookup("List:")._add(scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:Dawn.print(string._value)")._bind(scope._lookup("NewInput:string_$"))) ,scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:Dawn.print(number._value.toDecimal())")._bind(scope._lookup("NewInput:number_$"))))._bind(scope._lookup("Console")))._in_go(scope);

};
module.exports = fn;

