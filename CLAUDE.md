# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Dawn** is a flow-based programming language built around a single unifying concept: **everything is a URI, and everything is a resource**. Programs are constructed by binding resource URIs together with the `>>` operator — data flows from one resource's output to another's input.

The syntax `Scheme:identifier` is a literal URI. `String:Hello` resolves the URI `String:Hello` (scheme = `String`, identifier = `Hello`). This same mechanism extends seamlessly to real network protocols: `smtp:user@host`, `http:example.com/path`, or any custom protocol. The language makes no distinction between a local primitive and a remote service — both are just URIs being resolved and bound.

Example: `String:Hello>>Console:` resolves a String resource and pipes it into the Console resource.

## Build & Execution Commands

### Development Server
```bash
node dawn_console.js
```
Starts the Express server with web IDE on **port 5000**. Features:
- Interactive terminal interface (xterm.js via `@xterm/xterm`)
- Code editor with syntax highlighting (ACE editor)
- Real-time compilation and execution
- Socket.io for client-server communication

### Running Dawn Programs
```bash
# CLI execution (Node.js)
node dawn_run.js <filename.dawn>

# Windows batch alternative
dawn.bat <filename.dawn>

# Run test suite
node run_tests.js
```

### Dependencies
```bash
npm install
```
Installs: Express, Socket.io, @xterm/xterm, big-rational for arbitrary precision math, ACE editor, compression, mime-kind, @material UI components.

## Architecture

### Core Concepts

**Resources**: Everything is a resource—primitives, functions, objects, lists. Each resource has:
- **Input functions** (`in_*`) that receive data
- **Output functions** (`out_*`) that send data
- **A Processor** that manages one instance of the resource's behavior

**Data Flow**: Asynchronous, Promise-based. When you bind two resources, input triggers async operations, and results propagate downstream.

**Processors**: Instantiated per flow. Multiple processors can operate on the same resource without interference. This allows the same resource definition to handle concurrent operations.

### File Organization

**Root Level**:
- `DawnCompiler.js` - Compiler entry point
- `dawn_run.js` - CLI runner; parses source, instantiates processor, executes program
- `dawn_console.js` - Web server; handles file I/O, directory listing, compilation routes
- `hubserver.js` - Socket.io configuration for real-time communication
- `run_tests.js` - Test runner
- `checkForLocalHost.js` - Host validation utility

**Language Implementation** (`/dawn`):
- `DawnCompiler.dawn.js` - Main compiler: tokenizes source → parses grammar → generates JavaScript
- `Flavors/basic.bnft` - BNFT grammar for the basic Dawn syntax flavor
- `Flavors/shared.bnft` - Shared grammar rules (whitespace, URI characters, character classes)
- `Identifier.js`, `loop.js` - Control flow primitives
- `Console.dawn.js` - Built-in console output resource
- `Native/Javascript.js` - Native JavaScript interop
- `Scheme/file.dawn.js` - File system resource scheme

**Data Type Resources** (`/dawn/Content-Type/data`):
- `Resource.dawn.js` - Base class for all resources; defines input/output list management and resource lookup
- `String.dawn.js`, `Number.dawn.js`, `Boolean.dawn.js`, `List.dawn.js` - Primitive types
- `Data.dawn.js` - Generic data holder
- `Flow.dawn.js` - Flow control resource
- Subdirectories — type-specific operations:
  - `String/` — `concatenate.dawn.js`, `equal.dawn.js`
  - `Number/` — `add`, `subtract`, `multiply`, `divide`, `power`, `reciprocate`, `negate`, `times`
  - `Boolean/` — `and`, `or`, `not`, `if`

**Meta Resources** (`/dawn/Content-Type/application`):
- `dawn.dawn.js` - Dawn-as-resource (meta: Dawn interpreting Dawn programs)

**Web Frontend** (`/public`):
- `dawn.js` - Runtime library: module loading, browser/Node.js compatibility, resource caching
- `index.html` - Terminal UI entry point
- `editor.html` - IDE entry point
- `/codeexamples` - Sample programs demonstrating language features

**Grammar Parser** (`/BNFT`):
- `BNFT.js` - BNFT parser (Backus-Naur Form Transform); used by the Dawn compiler
- `*.BNFT` - Example grammars: `Brainfuck.BNFT`, `Turtle.BNFT`, `BNFT_to_JS.BNFT`
- See `/BNFT/README.md` for BNFT grammar documentation

**Test Programs**:
- `Test/SourceTest.dawn` - Integration test for source evaluation
- `public/codeexamples/HelloWorld.dawn` - Demonstrates primitives and operations
- `public/codeexamples/TheQuestion.dawn` - Arbitrary-precision computation (42 = x³+y³+z³)
- `public/codeexamples/Test.dawn` - Number literal format tests

### Compilation Pipeline

1. **Tokenizer** (DawnCompiler): Converts source into tokens, handles significant whitespace
2. **Parser** (BNFT-based): Matches tokens to grammar rules in `Flavors/basic.bnft`
3. **Code Generation**: Produces JavaScript with async/await and Promise chains
4. **Execution**: Node.js evaluates the compiled code in a processor context

Example transformation:
```
String:Hello>>Console:
  ↓
await this.lookup('String:Hello') >> bind to this.lookup('Console:')
  ↓
JavaScript with nested async function calls
```

### Key Input/Output Patterns

**Basic binding**: `Resource:constructor>>AnotherResource:`

**Multiple inputs** (list): `[item1 item2]>>Resource.operation:`

**Explicit I/O selection**: `Resource:constructor?input=name#output=name`

**Special markers**:
- `_$all` - Catch-all input (doesn't disappear when connected)
- `_$explicit` - Only appears if explicitly mentioned
- `_$group_name` - Groups inputs; connecting one removes others in the group

### Data Types & Precision

**Numbers**: Use BigRational (arbitrary precision) by default. Support multiple bases:
- `Number:42` - Decimal
- `Number:1_000_000` - Underscore separators for readability
- `Number:1001#2` - Binary
- `Number:FFFF#16` - Hexadecimal
- `Number:1.5e2` - Scientific notation

**Strings**: Immutable, concatenation via `String.concatenate:`

**Booleans**: `Boolean:true` and `Boolean:false` with logical operations

**Lists**: Heterogeneous collections; operations like `add`, `iterate`

### Resource Definition Pattern

When creating custom resources, follow this structure:
```javascript
function MyResource() {
  Resource.call(this, "MyResource");
  this.Processor = MyResourceProcessor;
}

function MyResourceProcessor(resource) {
  Resource.Processor.call(this, resource);

  // Input handlers: in_<type> or in_<type>_<group>
  this.in_String = function(input) { /* process */ };

  // Output: out_<type> or out_<type>_<group>
  this.out_String = null; // Set by binding

  // Called when resource is constructed with a URI parameter
  this.in_instanciate = function(input) {
    let newObject = this.get_resource().clone();
    // Configure newObject based on input
    return newObject.instanciate_processor();
  };
}

MyResource.Processor = MyResourceProcessor;
module.exports = MyResource;
```

### Browser vs. Node.js

`public/dawn.js` abstracts the environment:
- **Browser**: Uses XMLHttpRequest for module loading, dynamic imports
- **Node.js**: Uses native `require()`

Module paths are normalized to `.dawn.js` extensions automatically.

### Testing

No automated test framework currently. To verify functionality:
1. Run the test suite: `node run_tests.js`
2. Run a specific program: `node dawn_run.js Test/SourceTest.dawn`
3. Use the web IDE: `node dawn_console.js` then open `http://localhost:5000`

### Important Conventions

- **File naming**: `.dawn` = source, `.dawn.js` = compiled resource, `.bnft` = grammar
- **Processor naming**: Resource class `Foo` has processor `FooProcessor`
- **Input/output markers**: Always prefix with `in_` or `out_`
- **Type markers**: After `in_` or `out_` the type comes i.e. `out_Boolean` 
- **Input/Output names**: After `in_` or `out_` and the type an optional name comes i.e. `out_go_else`
- **Resource naming**: Resources that carries a value ("Boolean","String") starts with capital letter, Resources that compute starts with lowercase
- **Async-first**: All I/O is promise-based; operations may not complete synchronously
- **Error handling**: Minimal; errors propagate via `in_error` or `out_error` handlers, no throws/exceptions unless user 'catches' the `out_error`

