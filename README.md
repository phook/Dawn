Dawn Programming Language
=========================

The Dawn programming language is primarily a playground for myself to tryout different ideas about programming languages, that I have had during my 30+ year career. That said it is also meant as being the most powerful scripting language to automate different types of functionality, again mostly for my own benefit.

However, I have had some problems *conveying* to other people what I have been talking about, so I have decided to change to project to public even though its just in a 0.0.1 fase.

Basic Ideas
-----------

Dawn is closely related to flow based programming. If you are familiar with Unix pipes, the way of programming will seem somewhat like that (although it is not implmemented like Unix pipes).

A primary idea is that there are no traditional functions (where you *call* a functions with parameters and it *returns* a value). In Dawn you call the function with parameters, and the function calls the result forward to another function with the result as parameters. The function or resource thus have inputs and outputs, which can be coupled together.

In Dawn there are only resources which acts as primitives, function, objects, lists and whatever. Actually Dawn is sort of malleable and you can change all the basic behavior. This means that it is a convention based language, so users needs to agree on the conventions.

Dawn has an extra step of compilation to allow personal syntax sugaring. This means that you can choose to have significant whitespace, or pascal like assignments if you like. A goal is to do this step 2 way, so everyone can use each others sources but view them in their particular favorite flavor of syntax. In order for this you have to give up controlling every single char in the source, and *live* with a prettified version of your code (remember you can change the rules if you dont like it).

Basic Syntax
------------

A "Hello World" example in Dawn could look like this:

String:Hello%World >> Console

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


