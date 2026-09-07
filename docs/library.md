# Dawn Standard Library — Coverage Matrix

> Every resource below must also carry a `Meta.documentation:` sidecar —
> see `documentation-standard.md`; generate browsable docs with
> `node build_docs.js` (output: `docs/api/`, gitignored).

Status of the built-in resources. Test = has a passing case in `Test/cases/dawn/`.
Legend: ✅ exists+tested · ⚠️ exists, untested/incomplete · ❌ missing · ⏸️ deliberately deferred

## Core data resources (`dawn/Content-Type/data/`)

### String

| Resource | Ports | Status |
|---|---|---|
| `String:` | value | ✅ |
| `String.concatenate:` | `in_String_$all` → `out_String` | ✅ |
| `String.equal:` | `in_String_$all` → `out_Boolean` | ✅ |
| `String.length:` | `in_String_$all` → `out_Number` | ✅ *(interim operator — should become a named output on `String` when output interfaces land, see docs/output-interfaces.md)* |
| `String.upper:` / `lower:` / `trim:` | `in_String_$all` → `out_String` (streaming) | ✅ |
| `String.split:` | `in_String_$all` + positions (`in_Number_position`, `in_Number_$all`) → `out_String` per piece | ✅ |
| `String.replace:` | `in_String_subject`/`search`/`replacement` → `out_String` | ✅ |
| `String.substring:` | `in_String_$all` + `in_Number_start`/`end` → `out_String` | ✅ |
| `String.indexOf:` | `in_String_subject`/`search` → `out_Number` | ✅ |

### Number

| Resource | Ports | Status |
|---|---|---|
| `Number:` | bases `#2..#16`, `_` separators | ✅ (base-literal bugs found & fixed via tests) |
| `add:` `subtract:` `multiply:` `divide:` `power:` `reciprocate:` `negate:` | accumulation → `out_Number` | ✅ |
| `less:` / `greater:` / `equal:` | chained comparison → `out_Boolean` | ✅ |
| `modulo:` | `in_Number_dividend` + `$all` divisors → `out_Number` | ✅ |
| `min:` / `max:` | accumulation → `out_Number` | ✅ |
| `floor:` / `ceil:` / `round:` | streaming → `out_Number` | ✅ |
| `times:` | `in_Number_$all` → `out_go` + `out_Number` (index 0..n-1), time-sliced | ✅ |

### Boolean / List / other

| Resource | Status |
|---|---|
| `Boolean:` `not:` `or:` `and:` `if:` | ⚠️ |
| `List:` `add` `iterate` | ⚠️ |
| `List.length:` (counts streamed elements) | ✅ |
| `List.join:` (streams → one String) | ✅ |
| `List.get:` (index as named port or `?|index=n`; element re-emitted with its own type) | ✅ |
| `List.remove:` (index via param; streams the rest, order-preserving) | ✅ |
| `List.map:` / `List.filter:` (`Reference:`-based, param or flow) | ✅ |
| `Data:` `Flow:` | ⚠️ |

## Control flow

| Resource | Status |
|---|---|
| `times:` | ✅ (existing `Number.times` enhanced with index output) |
| `Identifier:` | ⏸️ deferred to Phase 2 — mutable variables need scope support first (Note 7 "VARS and REFERENCES"); `dawn/Identifier.js` is the obsolete pre-Processor API, do not use |
| `loop:` / `while:` | ⏸️ deferred — needs break semantics; `dawn/loop.js` is the obsolete pre-Processor API |
| `clock:` / `interval:` | ⏸️ sketch at `dawn/Clock.dawn_basic`, awaits basic flavor |

## Schemes (`dawn/Scheme/`)

| Scheme | Status |
|---|---|
| `file:` module loader | ✅ (documented) |
| `file:<path>?write` / `?append` data sink (mutually-exclusive inputs pick the op) | ✅ |
| `file:<path>?read` read + content-type cast + late-connect | ✅ |
| `http:` / `https:` client (late-cast into String/Image/Data; error channel on failure) | ✅ (integration-tested) |
| `http:` server | ❌ (Phase 3 keystone) |
| `socket:` / websocket | ❌ (needed to port `hubserver.js`) |
| `mime:` | ❌ (casting rules currently live in `Scheme/cast`) |
| `Console:` | ✅ |

## Content-type casting (late connect)

Schemes that load external content (`http:`, `https:`, `file:?read`) cannot know
the content's type before loading it. The rule per design: **cast after load,
then connect**. `Scheme/cast` owns the mapping (text/* → String, image/* →
Image, application/json → Data, else → Data) and the cast value late-connects
to the next resource in the flow. Anticipates the pin/interface model
(`output-interfaces.md`).

## Resource placement & naming (the MIME convention)

- **Schemes** live in `dawn/Scheme/<scheme>.dawn.js` (`http`, `file`, …).
- **Content types** live under `Content-Type/<type>/` mirroring MIME types:
  lowercase (`image`, `audio`, `application/json`, …). A content type is two
  siblings: `Content-Type/image/image.dawn(.js)` the resource, and the folder
  `Content-Type/image/` holding its subtypes/operations. Don't invent types
  early; add only when needed.
- **`data/`** holds Dawn's primitives (`String`, `Number`, `Boolean`, `List`,
  `Reference`, `Data`) — capitalized like value resources. It's not a real
  MIME type — a Dawn extension for primitives — and collides with the `data:`
  scheme. Rename candidates: `primitive` (describes what they are), `literal`
  (they're language literals), `core`, `scalar` (would exclude List). **Keep
  `data/` for now.**
- **Value resources are capitalized** (`Number`), **operators lowercase**
  (`add`, `times`) — convention, not enforcement... yet.

## Conventions (learned the hard way — enforced going forward)

- **Parameter drop-in inputs**: an operator's named input ports can be
  pre-positioned with URI parameters mimicking URL query syntax —
  `divide:?|dividend=2` ≡ feeding `2>>divide:`. Syntax: `Resource:?|name=value`
  (repeat with `&|name2=value2`). Value typing: `"quoted"` → String, `true`/`false`
  → Boolean, leading digit/`+`/`-`/`.` → Number, **anything else → String**.
  (String literals starting with a digit need quotes: `|x="5a"`.)
- A parameter names the *exact* port: `?|position=…` fills `in_Number_position`.
  Declare the port under exactly that name (no `_$all` suffix) for it to be
  fillable. Parameter-filled ports are **occupied** — flow elements do not
  rebind them (enforced in `build_input_list`).
- Parameterized operators call `this.fire_end_parameters()` at the start of
  `in_begin` — parameters are *pre-positioned inputs*, fed before flowing data.
- **Emit timing**: named inputs that complete a resource emit from the input
  function; `_$all` catch-all accumulators emit in `in_end`.
- **Errors are values on the error channel**: resources never throw across the
  flow — they emit `{value: <message>}` through `out_error` (e.g. an invalid
  `Number:zz` literal emits "Number: invalid literal zz" when triggered).
  `Console:` prints the error channel (its `in_error_$all`); uncaught errors
  die silently if nothing listens — bind the error channel when diagnosing.

- `in_begin` resets accumulator; `in_<Type>_$all` consumes; `in_end` emits.
- **Never use arrow closures capturing `this` for ports.** Processors are cloned
  via `Object.assign` — arrow functions keep the *original* `this`, so state
  silently updates the wrong instance. Always `function(){ ... }`.
- Every emit is optional-chained: `this?.out_X?.({value})` — never `this?.out_X(...)`.
- Construction uses `bigRat(0)` (not `bigRat(0,10)`).
- **Namespace shadowing**: in a flow, `times:` after a Number can resolve to
  `Number.times:` (Flow looks up children of the previous element's type before
  the global namespace). Check for an existing child resource before adding a
  same-named global one.
- Errors propagate via `in_error`/`out_error`, never thrown (convention **TBD**
  — documented here once decided).
