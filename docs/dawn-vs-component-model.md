# Dawn Semantics — vs Component Model 0.3

A short list of Dawn's semantics that don't map cleanly onto conventional programming languages or the WASM Component Model 0.3. Each item is current behaviour in Dawn (JS guise), the gap it creates with WIT, and the proposed resolution.

## 1. URI as both type and value

**Dawn:** `String:Hello` is a single URI that names the *type* `String` *and* provides the *value* `Hello`. `smtp:user@host` names the protocol *and* identifies a target.

**CM 0.3:** WIT splits these — `interface name { ... }` defines a type; a function signature carries the type as a parameter. There is no "type-as-value" lexical form.

**Resolution:** Treat the URI prefix (`String:`, `smtp:`) as a path-component that resolves to a WIT type via the host's `dawn:scheme/<Scheme>` lookup, and the suffix as the body of an instance handle or payload. Component Model 0.3's own scheme (e.g. `wasi:http/types`) uses dotted-path nomenclature — Dawn's colon-separated form can stay native.

## 2. Token equality between function and value

**Dawn:** `String:concatenate:` (note trailing colon) is a Resource whose *port* an input is connected to. The same `:` separator marks both constructors and ports. No syntactic distinction.

**CM 0.3:** A function (`interface I { f: func(); }`) and an instance (`resource r { ... }`) are syntactically distinct.

**Resolution:** Dawn's lower-level token has implicit context (post-colon or bare URI). No rewrite needed at the WIT layer; at parse time, a Dawn URI maps to either a resource handle (instance-with-port) or a value directly held. The compiler emits the right ABI calls based on how the URI is used (`lookup(...)` vs direct `await`).

## 3. List and Flow are themselves Resources

**Dawn:** `dawn/Content-Type/data/List.dawn.js` defines `List` and its `Processor` with manual overrides of `lookup_new`, `add`, `connect`, `connect_function`, `offer_connection`. Same for `Flow`. Users override their semantics by writing `*.dawn.js` files in the same convention directories.

**CM 0.3:** The component model does not have built-in List/Flow primitives; WIT collections are `list<T>` (a type) and component wiring is via imports and exports.

**Resolution:** Map `List` to a host-provided component implementing `dawn:collections/list` with `stream<T>` semantics. Map `Flow` to a host-only construct (no WIT export). When porting, both have to be re-implemented as WASM components if the WASM host is to be "Dawn-equivalent".

## 4. Override propagation runs through the resource tree

**Dawn:** `Resource.lookup_new(identifier, searchToRoot)` walks `children[name]`, then walks up to `resource.owner`. Override happens by `resource.add(new Override()).set_owner(parent)` — the override becomes a child, and `lookup_new` finds it before the default.

**CM 0.3:** Dynamic dispatch is built into the canonical ABI; once a component or interface is named at instantiation, the binding is fixed. Hot-swap overrides are not first-class.

**Resolution:** Preserve the dynamic walk in the **host**, not in core wasm. The wasm component only sees the resolved result of `lookup`. The runtime's `owner/children` chain is host-private and not embedded in WIT. Empirically: emit a single wasm component per Dawn source that imports `dawn:runtime/lookup`; the host routes by URI string. Same answer as item 1 — compiler does not resolve URIs at compile time.

## 5. Constructor-as-URI

**Dawn:** `String:Hello` constructs a `String` resource with payload `Hello`. The colon is dual: `Scheme` (constructor name) and `value` (constructor argument).

**CM 0.3:** Constructor is a method of a `resource` type, called with arguments:

```
resource blob { constructor(init: list<u8>); }
```

**Resolution:** Detect the colon-syntax and lower to a constructor call on the resolved resource type; payload becomes the constructor argument. For multiple payloads (`Scheme:A&B`), emit a list-typed or tuple-typed constructor argument. Type-driven decision.

## Open questions / future gaps

The above 5 are the well-known gaps. Others to validate before lockdown:

- A resource's `in_X/explicit`/`_$group` ports are typed by their *name* plus connectivity rules. CM 0.3 requires a fixed signature per method — Dawn's multi-typed ports (e.g. `console` accepting all of `in_Number_all`, `in_String_all`, `in_Boolean_all`) become a WIT resource that imports each type separately or, simpler, an external-ish `console` resource with multiple constructor methods.
- URI-precedence (first `:` denotes scheme; colon in operator overload ambiguity; `&` as separator etc.) — current Dawn seldom hits these, but porting should instrument the URI parser to record edge cases.
- The compiler does not currently support `define NameX { ... }` overriding an existing built-in (`define String { … }`). The override is only possible at runtime. This is a Dawn-side bug worth fixing before any port.

## Why this list matters for the WASM port

These gaps are not blocking issues per se. They're design-affirming observations: the WASM port is **not** "compile Dawn tokens to WIT verbatim". It's a layer that must preserve:

- Runtime URI routing (no static name resolution at compile time).
- Host-side override walk (not embedded in wasm core).
- Native-target slots keyed by host target (not by source-file structure).
- Constructor-as-URI semantics (lexer detects colon; emit is constructor + payload).