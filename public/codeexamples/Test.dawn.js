function bind(o){return o._lookup("Block:")._bind(o._lookup("List:")._add(o._lookup("Number:1_000_000"),o._lookup("Number:1001_0100#2"),o._lookup("Number:FFFF#16"),o._lookup("Number:7#10")))}let boundFunction=null;function go(o){boundFunction=boundFunction||bind(o),boundFunction._in_go(o),go._bind=bind}module.exports=go;