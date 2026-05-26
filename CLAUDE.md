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
Starts the Express server with web IDE on port 3000. Features:
- Interactive terminal interface (jquery.terminal)
- Code editor with syntax highlighting (ACE editor)
- Real-time compilation and execution
- Socket.io for client-server communication

### Running Dawn Programs
```bash
# CLI execution (Node.js)
node dawn_run.js <filename.dawn>

# Windows batch alternative
dawn.bat <filename.dawn>
```

### Dependencies
```bash
npm install
```
Installs: Express, Socket.io, @material UI components, xterm, big-rational for arbitrary precision math, ACE editor, jquery.terminal.

## Architecture

### Core Concepts

**Resources**: Everything is a resource—primitives, functions, objects, lists. Each resource has:
- **Input functions** (`in_*`) that receive data
- **Output functions** (`out_*`) that send data
- **A Processor** that manages one instance of the resource's behavior

**Data Flow**: Asynchronous, Promise-based. When you bind two resources, input triggers async operations, and results propagate downstream.

**Processors**: Instantiated per flow. Multiple processors can operate on the same resource without interference. This allows the same resource definition to handle concurrent operations.

### File Organization

**Language Implementation** (`/dawn`):
- `DawnCompiler.dawn.js` - Main compiler: tokenizes source → parses grammar → generates JavaScript
- `Flavors/basic.bnft` - BNFT grammar definition for the basic syntax flavor
- `Identifier.js`, `loop.js` - Control flow primitives
- `Console.dawn.js` - Built-in console output resource

**Data Type Resources** (`/dawn/Content-Type/data`):
- `Resource.dawn.js` - Base class for all resources; defines input/output list management and resource lookup
- `String.dawn.js`, `Number.dawn.js`, `Boolean.dawn.js`, `List.dawn.js` - Primitive types
- `Data.dawn.js` - Generic data holder
- Subdirectories (String/, Number/, Boolean/) - Type-specific operations (e.g., `Number/add.dawn.js`)

**Web Frontend** (`/public`):
- `dawn.js` - Runtime library: module loading, browser/Node.js compatibility, resource caching
- `index.html` - Terminal UI entry point
- `editor.html` - IDE entry point
- `/codeexamples` - Sample programs demonstrating language features

**Server Entry Points**:
- `dawn_console.js` - Web server setup; handles file I/O, directory listing, compilation routes
- `dawn_run.js` - CLI runner; parses source, instantiates processor, executes program
- `hubserver.js` - Socket.io configuration for real-time communication

### Compilation Pipeline

1. **Tokenizer** (DawnCompiler): Converts source into tokens, handles significant whitespace
2. **Parser** (BNFT-based): Matches tokens to grammar rules, builds expression tree
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
- `Number:1001#2` - Binary
- `Number:FFFF#16` - Hexadecimal
- `Number:1.5e2` - Scientific notation

**Strings**: Immutable, concatenation via `String.concatenate:`

**Booleans**: `Boolean:true` and `Boolean:false` with logical operations

**Lists**: Homogeneous collections; operations like `add`, `iterate`

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
  
  // Instantiation: called when resource is constructed with parameters
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
- **Node.js**: Uses native require()

Module paths are normalized to `.dawn.js` extensions automatically.

### Testing

Currently no automated test framework. Test programs exist in `/Test` and `/public/codeexamples`. To verify functionality:
1. Run a test program: `node dawn_run.js Test/SourceTest.dawn`
2. Check console output (HelloWorld.dawn, Test.dawn, TheQuestion.dawn are documented examples)

### Important Conventions

- **File naming**: `.dawn` = source, `.dawn.js` = compiled executable, `.bnft` = grammar
- **Processor naming**: Resource class `Foo` has processor `FooProcessor`
- **Input/output markers**: Always prefix with `in_` (input) or `out_` (output)
- **Async-first**: All I/O is promise-based; operations may not complete synchronously
- **Error handling**: Minimal; most errors propagate via `in_error` or `out_error` handlers

