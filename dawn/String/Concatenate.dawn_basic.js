function bind(n){return n._lookup("Block:")._bind(n._lookup("List:")._add(n._lookup("Pipe:")._add(n._lookup("Native.Javascript:var%20self%20%3D%20this%0D%0A%20%20%20%20self._out_string%20%3D%20null%0D%0A%20%20%20%20self._in_begin%20%3D%20function(pipe)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20self._value%20%3D%20%22%22%0D%0A%20%20%20%20%7D%0A%20%20%20%20self._in_go%20%3D%20async%20function(pipe)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20if%20(pipe._out_string)%0D%0A%20%20%20%20%20%20%7B%20%20%20%20%20%20%20%20pipe._out_string(self)%0D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%20%20self._in_string_%24%20%3D%20function(pipe%2C%20s)%0D%0A%20%20%20%20%7B%20%20%20%20%20%20self._value%20%2B%3D%20s._value%0D%0A%20%20%20%20%7D")._bind(n._lookup("NewObject:Concatenate")))))}let boundFunction=null;function go(n){boundFunction=boundFunction||bind(n),boundFunction._in_go(n),go._bind=bind}module.exports=go;