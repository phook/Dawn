function fn(scope) {
scope._lookup("Pipe:")._add(scope._lookup("Native.Javascript:var%20self%20%3D%20this%0D%0A%20%20%20%20self._out_number%20%3D%20null%0D%0A%20%20%20%20self._in_begin%20%3D%20function(pipe)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20self._value%20%3D%20new%20Dawn.bigRat()%3B%0D%0A%20%20%20%20%7D%0A%20%20%20%20self._in_go%20%3D%20async%20function(pipe)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20if%20(pipe._out_number)%0D%0A%20%20%20%20%20%20%7B%20%20%20%20%20%20%20%20pipe._out_number(self)%0D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%20%20self._in_number_minuend%20%3D%20function(pipe%2C%20number)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20self._value%20%3D%20number._value%0D%0A%20%20%20%20%7D%0A%20%20%20%20self._in_number_subtrahend%20%3D%20function(pipe%2C%20number)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20self._value%20%3D%20self._value.subtract(number._value)%0D%0A%20%20%20%20%7D")._bind(scope._lookup("NewObject:Subtract")))._in_go(scope);

};
module.exports = fn;

