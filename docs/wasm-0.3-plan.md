# WASM 0.3 Compiler for Dawn — Roadmap

## Status

Roadmap document. Implementation is **deferred** while Dawn matures in its current JavaScript guise. The compiler, BNFT, and host-side runtime should gain enough "shoe-leather" first to validate core Dawn semantics (List/Flow being Dawn resources, override-resolution via `lookup_new`, lack of normal-language concepts). Once those are stable, this plan is the WASM port's starting point.

## Why we are waiting

- **List and Flow are themselves Dawn Resources** (`dawn/Content-Type/data/List.dawn.js`, `dawn/Content-Type/data/Flow.dawn.js`). They override `lookup_new`, `add`, `connect`, `offer_connection`. The full mechanics must be understood before porting.
- **Override propagation** runs through the resource tree (children + owner chain). The compiler does **not** know about overrides — it defers entirely to runtime `lookup_new`. A WASM port must preserve this dynamism.
- Several Dawn-specific semantics do not map cleanly onto known programming languages. See `docs/dawn-vs-component-model.md`.

## Headline idea

A single compiler class (`DawnCompiler.dawn.js`) gains a `compileTarget` field that switches which native slot it reacts to:

- `target === "javascript"` (default) — reacts to `Native.Javascript:` block.
- `target === "wasm"` — reacts to `Native.Wasm:` block.

Both bodies, when present in source, are registered into the runtime's target-keyed children map. The host picks which body to run based on its own declared compile target. This means:

- One compiler class instead of two parallel implementations.
- BNFT stays untouched for now.
- Adding WASM is additive; backwards-compatible `target=javascript` reproduces today's behavior bit-for-bit.
- A node missing the body for the active target is a **silent no-op**: the lookup returns `null`, runtime surfaces it through `out_error`.

## Mapping — Dawn ↔ Component Model 0.3 / WIT

| Dawn concept               | WIT/CM 0.3 counterpart                                         |
|----------------------------|----------------------------------------------------------------|
| `Scheme:identifier` URI    | WIT package + identifier                                       |
| `Native.Javascript:` body  | Host-side evaluated JS body                                    |
| `Native.Wasm:` body        | Inline WAT / `.wasm` reference (later BNFT sugar)              |
| `Resource` value           | `resource r { ... }` (owned handle)                            |
| `in_<T>` input port        | Resource method: `%[method]r.in-T: func(self: borrow<r>,...)` |
| `out_<T>` output port      | Resource method returning `T`                                  |
| `>>` (single element)      | `future<T>`                                                    |
| `>>` (collection/List)    | `stream<T>` with backpressure                                  |
| `_$all` input              | borrowed-self method with default param                        |
| `_$explicit`               | declared only when name appears                                |
| `_$group_name`             | single own-handle taken; sibling handles dropped               |
| `define X { ... }`         | WIT `resource x { ... }`                                       |
| `Flow`, `List`             | Host-only ephemeral; not exported in WIT                       |
| `file:`, `http:`, `smtp:`  | External worlds per scheme; `include`-adaptered               |

## Compiler design

### One class, target flag

`dawn/DawnCompiler.dawn.js`:

1. Constructor field `this.compileTarget = "javascript"` (overridden by env or CLI).
2. CLI hooks: `dawn_run.js` and `dawn_console.js` read `DAWN_TARGET` env or `--target js|wasm` CLI flag.
3. `Native.Wasm:` URI prefix recognized in parallel with `Native.Javascript:`.
4. Parser dispatches based on `compileTarget`:
   - `compileTarget === "javascript"` → existing inlined JS body.
   - `compileTarget === "wasm"` → host lookup via `native/wasm/<Name>`.
5. Default target is `"javascript"` (full back-compat).
6. Single-side bodies are silent no-ops.

### Why not two compilers?

Two classes would replicate the entire pipeline for no benefit. The compiler already routes by URI prefix; extending the prefix set is a one-line additive change, not a fork.

### Why not BNFT changes first?

Per the user's guidance: "how you interact in a native block will probably not be 'smart' — user will have to know how to interact with the compile layer behind." BNFT sugar for `native wasm { ... }` is deferred until users routinely write inline WAT bodies. Until then, source-level pattern stays:

```
define Foo {
  native javascript { ... }
  // when BNFT adds:  native wasm { ... }
}
```

Both bodies are reachable by `native/{javascript,wasm}/<Name>` if present via the path-walk overlay.

## Path-walk overlay

A runtime extension of the existing owner/children lookup:

```
Dawn.register(impl, name, target)
```

This adds the implementation under a target-keyed children slot. New runtime-exposed resource:

```
urn:  dawn:runtime-target
value: returns active target string ("javascript" or "wasm")
       set at boot via host constructor config.
```

`lookup_new` extends its walk:

```
1. children[name]                              # classic name match
2. children[target][name]                      # target-keyed match
3. owner-chain walk (recurse)
```

So a `native/wasm/Foo.dawn.js` file is reachable when the active target is `"wasm"`. Same file but in `native/javascript/Foo.dawn.js` is reachable when `"javascript"`.

## Patch surface (drafted, not applied)

| File                                  | Change                                                           |
|---------------------------------------|------------------------------------------------------------------|
| `dawn/DawnCompiler.dawn.js`           | `compileTarget` field; `Native.Wasm:` URI recognition; branching |
| `dawn/runtime-target.dawn.js` (new)   | Trivial resource returning the active target                     |
| `dawn/native/wasm/`                   | Placeholder directory                                            |
| `dawn/native/javascript/`             | Mirror directory                                                 |
| `docs/native-targets.md`              | This convention                                                  |

## Phases

| Phase | Goal                                                                 | Done by                  |
|-------|----------------------------------------------------------------------|--------------------------|
| 0     | This plan is committed to disk                                       | Now (this doc)           |
| 0.1   | `compileTarget` field in compiler; `Native.Wasm:` uri at lines 449   | JS-side changes          |
| 0.5   | Default behavior unchanged for `target=javascript`                   | Verified                 |
| 1     | `runtime-target` resource                                           | Dawn-runtime files       |
| 2     | `Dawn.register(target="...")` primitive                             | Dawn-runtime files       |
| 3     | `lookup_new` walks `children[target][name]`                          | Dawn-runtime files       |
| 4     | First cross-target compile: `HelloWorld.dawn` with `target=wasm`     | Manual                   |
| 5     | Path convention enforced (`native/{javascript,wasm}/<Name>.dawn.js`) | Convention only          |
| 6     | BNFT sugar for `native wasm { ... }` (when users ask)               | Deferred                 |
| 7     | WASM host boots; cross-side parity with JS host                      | Future                   |

## Open items

- The existing URI parser (`Resource.dawn.js:181-195`) splits `?input=foo#output=bar`. Does `?target=wasm` slot through unmodified? Predicted yes; verify.
- WASM body format choices have been intentionally deferred until users want inline WAT. Path-walk + per-target directories relieve most needs.
- True fixes to the existing JS compiler (the `override` syntax gap) are independent of WASM work and worth pursuing **first**, before porting — see "Things to fix in JS guise first" below.

## Things to fix in JS guise first

A short list of Dawn specifics that the **current** compiler does not fully support and that are worth closing before porting:

1. **`define X { ... }` overriding an existing resource** (e.g. `define String { ... }` to install a custom String). The grammar and compiler do not currently have first-class override syntax; runtime-only workaround is to add a child under the target resource at runtime.
2. **`?target=wasm` selector** — verify URI grammar does the right thing.
3. **Symmetric `Native.Wasm:` block** — currently absent; additive change.
4. **Multiple native blocks per resource** — current grammar accepts one (`optional`-rule); allow a list when BNFT sugar lands.

## Decisions captured in this conversation

- Default compile target: `javascript`. Back-compat preserved.
- Missing-side (e.g. only `native wasm` body, target=`javascript`): silent no-op. Error surfaces through the resource's `out_error` port.
- One compiler with two slots, not two compilers.
- BNFT untouched for now.
- Path-walk overlay is just an extension of the existing owner/children walk, not a new system.
- WasI 0.3 specific choices: type-driven `future<T>` (single) vs `stream<T>` (collection). Component-Model-async for crossings. Borrow/own handles for resource semantics. See `dawn-vs-component-model.md`.
File 2: docs/native-targets.md
# Native Target Conventions — `javascript` and `wasm`