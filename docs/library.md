# Dawn Standard Library — Coverage Matrix

Status of the built-in resources. Test = has a passing case in `Test/cases/dawn/`.
Legend: ✅ exists+tested · ⚠️ exists, untested/incomplete · ❌ missing

## Core data resources (`dawn/Content-Type/data/`)

| Resource | Ports | Status |
|---|---|---|
| `String:` | `in_String_$all`, `out_String` | ⚠️ |
| `String.concatenate:` | `in_String_$all` → `out_String` | ✅ |
| `String.equal:` | `in_String_$all` → `out_Boolean` | ⚠️ |
| `String.length` | `in_String_$all` → `out_Number` | ❌ |
| `String.split` / `substring` / `replace` / `indexOf` / `upper` / `lower` / `trim` | | ❌ |
| `Number:` | `in_Number_$all`, `in_instanciate` (bases `#2..#16`, `_` separators) | ⚠️ |
| `Number.add:` `subtract:` `multiply:` `divide:` `power:` `reciprocate:` `negate:` `times:` | accumulation pattern → `out_Number` / `out_end` | ⚠️ |
| `Number.less:` `greater:` `equal:` (chained) | `in_Number_$all` → `out_Boolean` | ✅ |
| `Number.modulo` / `min` / `max` / `floor` / `ceil` / `round` | | ❌ |
| `Boolean:` `not:` `or:` `and:` `if:` | | ⚠️ (if: ⚠️ grammar-side gaps) |
| `List:` `add` `iterate` | | ⚠️ |
| `List.get` / `remove` / `length` / `map` / `filter` / `join` | | ❌ |
| `Data:` `Flow:` | | ⚠️ |

## Control flow

| Resource | Status |
|---|---|
| `Identifier:` (mutable reference — prerequisite for `Meta:Assignment`) | ⚠️ sketch at `dawn/Identifier.js` |
| `loop:` / `while:` | ⚠️ sketch at `dawn/loop.js`, `dawn/async.dawn_basic` |
| `times:` (repeat) | ⚠️ sketch at `dawn/times.dawn_basic` |
| `clock:` / `interval:` | ⚠️ sketch at `dawn/Clock.dawn_basic` |

## Schemes (`dawn/Scheme/`)

| Scheme | Status |
|---|---|
| `file:` read | ⚠️ exists |
| `file:` write / append / list / stat / delete / mkdir | ❌ (Phase 1; needed by Phase 3) |
| `http:` / `https:` client | ⚠️ basic-flavor sketch `dawn/http.dawn_basic` |
| `http:` server (`out_Request` / `in_Response`) | ❌ (Phase 1; the Phase 3 keystone) |
| `socket:` / websocket | ❌ (needed to port `hubserver.js`) |
| `mime:` | ❌ |
| `Console:` | ✅ |

## Conventions (to be enforced across the library in Phase 1)

- `in_begin` resets accumulator; `in_<Type>_$all` consumes; `in_end` emits.
- Every emit is optional-chained: `this?.out_X?.({value})` — never `this?.out_X(...)`.
- Construction uses `bigRat(0)` (not `bigRat(0,10)`).
- Errors propagate via `in_error`/`out_error`, never thrown (convention **TBD**
  — documented here once decided).
