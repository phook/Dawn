# Graph Report - .  (2026-07-21)

## Corpus Check
- 171 files · ~96,770 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 511 nodes · 570 edges · 53 communities (28 shown, 25 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Resource (Backup Variant)
- Resource (Sync Variant)
- Resource Core
- External Libraries
- Dawn Web Server / Compiler
- UIL Browser
- Package Metadata
- Test Runner
- List Resource
- Flow Resource
- BNFT Daughter Test
- Grammar Checker
- Number Subtract
- File System Resource Compiler
- Dawn Console
- Number Add
- Number Divide
- Number Multiply
- Number Power
- Boolean And
- Boolean Resource
- Boolean Or
- Data Resource
- Number Resource
- Number Times (Loop)
- String Concatenate
- String Resource
- Compiler Backend (uil-go)
- String Equal
- Identifier / Connection
- File Resource
- Boolean If
- Boolean Not
- Number Negate
- Number Reciprocate
- Loop Resource
- Native JavaScript
- Module Loading (require/using)
- OpenCode Config
- Graphify Plugin
- Favicon Manifest
- Hub Socket Client
- Resource New Input
- Resource New Output
- Resource New Resource
- RFC 4122 / UUID

## God Nodes (most connected - your core abstractions)
1. `ResourceProcessor()` - 35 edges
2. `ResourceProcessor()` - 34 edges
3. `ResourceProcessor()` - 29 edges
4. `ListProcessor()` - 11 edges
5. `Resource()` - 11 edges
6. `Resource()` - 10 edges
7. `Resource()` - 10 edges
8. `FlowProcessor()` - 8 edges
9. `toNumber()` - 6 edges
10. `ConsoleProcessor()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `require_simple()` --indirect_call--> `require()`  [INFERRED]
  public/using.js → public/require.js

## Import Cycles
- None detected.

## Communities (53 total, 25 thin omitted)

### Community 0 - "Resource (Backup Variant)"
Cohesion: 0.08
Nodes (4): clone(), dawnSort(), Resource(), ResourceProcessor()

### Community 1 - "Resource (Sync Variant)"
Cohesion: 0.08
Nodes (4): clone(), dawnSort(), Resource(), ResourceProcessor()

### Community 2 - "Resource Core"
Cohesion: 0.08
Nodes (4): dawnSort(), protectedFunctions, Resource(), ResourceProcessor()

### Community 3 - "External Libraries"
Cohesion: 0.05
Nodes (39): big-rational, compression, express, express-fileupload, express-transform-bare-module-specifiers, express-upload, lz-string, @material/button (+31 more)

### Community 4 - "Dawn Web Server / Compiler"
Cohesion: 0.05
Nodes (27): app, checkForLocalHost, { createReadStream }, DawnCompiler, environment, express, fileUpload, fs (+19 more)

### Community 5 - "UIL Browser"
Cohesion: 0.10
Nodes (18): attributes_to_transfer, DOMTraverse(), doTraverse(), findTemplateArguments(), getAttributeSetListener(), getMaxX(), getMaxY(), getMinX() (+10 more)

### Community 6 - "Package Metadata"
Cohesion: 0.11
Nodes (18): author, bugs, url, description, engines, node, homepage, license (+10 more)

### Community 7 - "Test Runner"
Cohesion: 0.13
Nodes (12): basicCasesDir, basicFiles, BNFT, dawnCasesDir, dawnFiles, { execSync }, fs, grammarSource (+4 more)

### Community 10 - "BNFT Daughter Test"
Cohesion: 0.20
Nodes (9): backBasic, basicGrammar, basicToDawn, basicVersion, BNFT, dawnSrc, fs, parser (+1 more)

### Community 11 - "Grammar Checker"
Cohesion: 0.22
Nodes (7): content, definitionOrder, definitions, duplicates, fs, lines, references

### Community 12 - "Number Subtract"
Cohesion: 0.22
Nodes (3): Number, Resource, subProcessor()

### Community 13 - "File System Resource Compiler"
Cohesion: 0.36
Nodes (3): FileSystemResource(), FileSystemResourceProcessor(), Resource

### Community 15 - "Number Add"
Cohesion: 0.25
Nodes (3): addProcessor(), Number, Resource

### Community 16 - "Number Divide"
Cohesion: 0.25
Nodes (3): divProcessor(), Number, Resource

### Community 17 - "Number Multiply"
Cohesion: 0.25
Nodes (3): mulProcessor(), Number, Resource

### Community 18 - "Number Power"
Cohesion: 0.25
Nodes (3): Number, powerProcessor(), Resource

### Community 24 - "Number Times (Loop)"
Cohesion: 0.33
Nodes (3): Number, Resource, timesProcessor()

### Community 27 - "Compiler Backend (uil-go)"
Cohesion: 0.29
Nodes (5): BNFT, fs, parser, target, uil_syntax

### Community 33 - "Number Negate"
Cohesion: 0.60
Nodes (3): negate(), negateProcessor(), Resource

### Community 34 - "Number Reciprocate"
Cohesion: 0.60
Nodes (3): reciprocate(), reciprocateProcessor(), Resource

### Community 38 - "OpenCode Config"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **136 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `{ execSync }`, `fs`, `path` (+131 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `External Libraries` to `Package Metadata`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `{ execSync }` to the rest of the system?**
  _136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Resource (Backup Variant)` be split into smaller, more focused modules?**
  _Cohesion score 0.07973421926910298 - nodes in this community are weakly interconnected._
- **Should `Resource (Sync Variant)` be split into smaller, more focused modules?**
  _Cohesion score 0.08246225319396051 - nodes in this community are weakly interconnected._
- **Should `Resource Core` be split into smaller, more focused modules?**
  _Cohesion score 0.07948717948717948 - nodes in this community are weakly interconnected._
- **Should `External Libraries` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Dawn Web Server / Compiler` be split into smaller, more focused modules?**
  _Cohesion score 0.05398110661268556 - nodes in this community are weakly interconnected._