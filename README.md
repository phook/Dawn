Dawn Programming Language
=========================

The Dawn programming language is primarily a playground for myself to tryout different ideas about programming languages, that I have had during my 30+ year career. That said it is also meant as being the most powerful scripting language to automate different types of functionality, again mostly for my own benefit.

However, I have had some problems *conveying* to other people what I have been talking about, so I have decided to change to project to public even though its just in a 0.0.1 fase, so its very much work in progress.

Basic Ideas
-----------

Dawn is closely related to flow based programming. If you are familiar with Unix pipes, the way of programming will seem somewhat like that (although it is not implemented like Unix pipes).

A primary idea is that there are no traditional functions (where you *call* a functions with parameters and it *returns* a value). In Dawn you call the function with parameters, and the function calls the result forward to another function with the result as parameters. The function or resource thus have inputs and outputs, which can be coupled together.

In Dawn there are only resources which acts as primitives, function, objects, lists and whatever. Actually Dawn is sort of malleable and you can change all the basic behavior. This means that it is a convention based language, so users needs to agree on the conventions.

Dawn has an extra step of compilation to allow personal syntax sugaring. This means that you can choose to have significant whitespace, or pascal like assignments if you like. A goal is to do this step 2 way, so everyone can use each others sources but view them in their particular favorite flavor of syntax. In order for this you have to give up controlling every single char in the source, and *live* with a prettified version of your code (remember you can change the rules if you dont like it).

Basic Syntax
------------

A "Hello World" example in Dawn could look like this:

String:Hello%20World >> Console

The conventions defined makes Dawn look in the Types folder or namespace where it finds String, that matches the beginning of the URI/URL. The rest of the URL is used as constructor.

">>" means bind, which binds the string output from the String resource to the string input in the Console.

The end of line "runs" the program.

The big payoff is that you can use https addresses natively in Dawn:

https://mysite.dk/greek.jpg >> file://localcopy.jpg

Running the source
------------------

Install NodeJS (needed for server) 
Install Chrome (needed for terminal)

npm install express
npm install socket.io

To run the server and display the terminal, you call launch.bat (windows only for the moment, but should be easy enouch to port - only simple stuff).

Library
-------

Not a lot of resources have been added as of yet, since the list is big of whishes:

- terminal needs a lot of work
- bootstrap
- run in browser
- numbers
- commands (if, loops)
- alternative flavor syntaxes (currently a basic flavor exists)

Design Observations
-------------------

The central idea — that everything is a URI resolving to a resource — is genuinely original. Most languages treat network I/O as a special case bolted on after the fact. In Dawn, `String:Hello`, `https://mysite.dk/image.jpg`, and `smtp:user@host` are all the same kind of thing: a URI that resolves to a resource with inputs and outputs. That unification is clean and powerful.

Scalability in Dawn is hierarchical rather than syntactic. A game is not a tangle of nested calls — it is `Joystick >> Game >> Screen`. Each resource hides its internal complexity behind a simple interface, and you compose at whatever level of abstraction makes sense. This is closer to how systems engineers think than how most programmers write code.

The hardest design problem is **binding**: when you connect two resources, the default behavior depends on the specific pair being connected. This gives the language great flexibility — a number bound to a console prints differently than a number bound to a file — but it means the programmer needs to understand or discover what any given connection does. That is a real cognitive cost, and the main place where Dawn demands trust in conventions rather than explicit contracts.

None of this is a problem for the intended use case. Dawn is a **playful scripting language** for automating workflows, wiring together internet resources, and exploring language ideas — not a language for systems that need formal verification. In that space, the convention-based, flow-first design is a strength: it is quick to connect things, easy to read simple pipelines, and flexible enough to grow with the task.


