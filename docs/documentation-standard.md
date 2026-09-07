# Dawn Documentation Standard

How library resources and projects are documented. Inspired by rustdoc (page
structure), Go (executable examples) and Python (docs as runtime data) —
realized the Dawn way: **documentation is a resource, written in `.dawn`
files.**

## Core rules

### 1. All documentation lives in `.dawn` files, never in `.dawn.js`

`.dawn.js` files are **generated artifacts** (built by `build_sources.js` from
`.dawn` sources). Nothing should be edited in `.dawn.js` — docs AND runnable
code both live in the `.dawn` source:

```
Meta.documentation:String.upper
Meta.documentation:Upper-cases every String passing through.
...
Meta.documentation:@status stable

define String.upper
  native javascript
  {
<const Resource = ... implementation js, verbatim, no prefix ...>
  }
  endnative
end
```

- `Meta.documentation:` sidecar/content: as before.
- `Meta.documentation:` lines first, then the implementation **as one canonical
  flow line**: `[Native.Javascript:<urlencoded source>]>>NewResource:<URI>`.
  (`native javascript { ... }` is basic-flavor surface syntax; canonical dawn
  URL-encodes the source into the `Native.Javascript:` resource URI. The
  encoder guarantees no `]` ever appears inside the payload, so list brackets
  stay bracket-safe.)
- `node build_sources.js` regenerates any stale `.dawn.js` (stale = source
  mtime differs from artifact mtime; artifacts carry source timestamps and the
  Windows hidden attribute). `--force` rebuilds everything.

The loader/runtime read the generated artifact — never the source directly —
so a Dawn server boots identically whether sources were touched or not.

### 2. A doc file is a legal Dawn program — every line is a `Meta.documentation:` resource

`Meta:` introduces resources the runtime ignores; the *entire file* consists of
such lines, so the file parses as valid (if inert) Dawn. Line 1 names the
subject; every other line carries one line of documentation:

```
Meta.documentation:String.upper
Meta.documentation:
Meta.documentation:Upper-cases every String passing through.
Meta.documentation:
Meta.documentation:@port in_String_addend_$all — each String to append
Meta.documentation:@example
Meta.documentation:String:Hello>>String.upper:>>Console:
Meta.documentation:---
Meta.documentation:HELLO
```

The extractor strips the `Meta.documentation:` prefix from every line and
treats the result as the document. A line without the prefix is an error.

The subject must equal the resource's real URI as derived from the file
location (enforced).

### 3. Two kinds of resources

Every resource is one of:

| kind | meaning | ports documented |
|---|---|---|
| `value` | holds a value (String, Number, Boolean, List, Data) | the value ports are **universal** — a value resource always has the default input for writing and output for reading its value, and `_go` always triggers the output. **These are never listed in the docs.** Only extra ports (named, typed) are documented. |
| `operator` | processes what flows through it (upper, add, times, Console, …) | all ports are documented (except the infrastructure ports below) |

Declared with `@kind value` or `@kind operator`.

Infrastructure ports are never documented: `in_go` (the universal trigger),
`in_begin` / `in_end` (flow lifetime), `in_error` (default error channel)
and their `out_` counterparts; `in_instanciate` is **not an input** — it is
the constructor mechanism and is never a port.

### 4. Ports are documented by parts

A port name decomposes:

```
  in_Number_addend_$all
  │   │      │      └─ modifier: _$all = catch-all, _$explicit = explicit
  │   │      └──────── name:  addend      (optional)
  │   └─────────────── type:  Number
  └─────────────────── direction: input
```

In the doc body a port is one `@port` line; the extractor decomposes the full
name into the parts and renders one row per port:

| name | type | dir | catch-all | meaning |
|---|---|---|---|---|
| addend | Number | in | ✓ | each Number to add |
| | Number | out | | the sum |

`@port` lines supply only the *meaning*; existence and decomposition come from
the implementation (see rule 5).

### 5. Ports are introspected, prose is annotated

The extractor derives the port list from the live implementation and takes
only *meaning* from `@port` lines. **Build fails** if a `@port` names a port
that doesn't exist, or an operator's port has no `@port` line. Documentation
cannot silently drift from the implementation.

### 6. Examples are tests

Every `@example` is executed by `Test/runner.js`, output compared against the
lines after `---`. If the docs lie, CI fails.

### 7. Pages mirror the resource hierarchy

One HTML page per resource; every page links down to its children. Nested
operations (`Number.times`) are child pages of their parent (`Number`).

## The project standard

Every **project** (the Dawn language, banana_melee, the future Dawn server, any
user project) has:

- **one top resource** whose doc page is the project's front page — purpose,
  audience, quick-start example;
- that page **links downward** through its children so a reader can descend
  into the inner workings (`Dawn:` → `Content-Type.data:` → `String:` →
  `String.upper:`);
- every resource in it documented per the rules above. No undocumented ports.

## Status values

| status | meaning |
|---|---|
| `stable` | part of the contract; breaking it breaks users |
| `interim` | works, but will be replaced (e.g. `String.length` until output pins land — see `output-interfaces.md`) |
| `experimental` | may change without notice |
| `internal` | not for user programs (runtime plumbing) |
| `deprecated` | kept for compatibility; use its `@see` target |

## Build & verify

```
node build_docs.js        # extracts docs → docs/api/*.html, cross-checks ports
node Test/runner.js       # includes all doc @example tests
```
