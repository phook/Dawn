function bind(o){return o._lookup("Block:")._bind(o._lookup("List:")._add(o._lookup("NewObject:Console"),o._lookup("Pipe:")._add(o._lookup("List:")._add(o._lookup("Pipe:")._add(o._lookup("Native.Javascript:Dawn.print(string._value)")._bind(o._lookup("NewInput:string_$"))),o._lookup("Pipe:")._add(o._lookup("Native.Javascript:Dawn.print(number._value.toDecimal())")._bind(o._lookup("NewInput:number_$"))),o._lookup("Pipe:")._add(o._lookup("Native.Javascript:Dawn.print(boolean._value%3F%22True%22%3A%22False%22)")._bind(o._lookup("NewInput:boolean_$"))))._bind(o._lookup("Console")))))}let boundFunction=null;function go(o){boundFunction=boundFunction||bind(o),boundFunction._in_go(o),go._bind=bind}module.exports=go;