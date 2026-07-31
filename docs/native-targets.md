# Native Target Conventions — `javascript` and `wasm`

## Purpose

Dawn URI lookups may resolve the same name (`Foo`) to a `javascript` implementation, a `wasm` implementation, or both. This doc captures the convention for naming, locating, and routing between them.

## The two slots

```
Native.Javascript:<encoded-body>      # inline body or path-walk fallback
Native.Wasm:      <encoded-body>      # pending WASM host; same shape
```

The compiler (`DawnCompiler.dawn.js`) recognises both URI prefixes; it picks which body registers at construction based on `compileTarget`. Both bodies, when present in source, get registered — just to different slots in the runtime.

## Two valid layouts

### Layout A — co-located in one source file

```
define Foo {
  native javascript { /* JS body */ }
  native wasm      { /* WAT body */ }
}
```

Both bodies are URI-encoded inline. The runtime picks which body to use at look-up time based on the active target. BNFT changes for the second form are deferred until users actually want inline WAT in source.

### Layout B — split directories (path-based)

```
dawn/native/javascript/Foo.dawn.js
dawn/native/wasm/Foo.dawn.js
```

The runtime resource for `Foo` is registered against the host's target via `Dawn.register(impl, "Foo", "javascript"|"wasm")`. The convention directories are loaded by the host at boot.

Both layouts compose. A program may mix and match.

## The runtime-target resource

```
urn:   dawn:runtime-target
value: "javascript" | "wasm"
```

A trivial Resource that returns the host's current target. Set at boot via host constructor config:

```js
Dawn.initialise({
  target: "wasm",                 // or "javascript"
  // ...
});
Dawn.register_runtime_target();   // bakes into dawn:runtime-target
```

## Path-walk lookup algorithm

When `lookup_new(identifier, searchToRoot)` is called, the walk is:

```
1. Strip the leading scheme segment.
2. If at this scope, look for children[name].
3. If not found, look for children[target][name]          (NEW)
4. If still not found, recurse into owner-chain unless banned.
5. If still not found, return null.
```

`target` here is fetched from the active `dawn:runtime-target`. The walk preserves all existing override semantics — steps 2 and 3 are pure additions.

## URI selector for target pre-emption

The existing URI grammar already exposes `?input=…&#output=…` selectors. The target slot should slot through similarly:

```
Foo?target=wasm
```

Implementation: `Resource.lookup` parser (around line 181-195) reads the `?` group as `inputs` and the `#` group as `outputs`. Add `target` to the selector list, parsed identically. Predicted **API-stable**, but verify.

## Path convention (running code)

```
dawn/native/{javascript,wasm}/<ResourceName>.dawn.js
```

Hosts walk their native directory at boot and `Dawn.register(...)` each implementation under the target key.

## Errors

A lookup that resolves to `null` (no children match, no target match, no owner walk hit) emits through the resource's existing `out_error` port. The silent no-op contract is preserved.

## Why this works without a fork

The runtime already has a path-walk resolution algorithm. Extending its match set is more local than introducing a parallel target-aware path. The compiler's target-flag is a routing decision, not a translation step. BNFT does not need to know about target until users opt into multiple bodies.