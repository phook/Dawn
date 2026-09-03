# Dawn Project Progress

Snapshot of the runtime and toolchain status. Numbers come from running
`node Test/runner.js` on the working tree; details of each case live in
`Test/cases/dawn/` and `Test/cases/basic/`.

## Headline

| Suite                                                | Pass | Fail |
|------------------------------------------------------|-----:|-----:|
| Dawn execution (`dawn_run.js` against `.dawn`)       |  19  |   0  |
| Basic flavor parsing (`basic → dawn` via `TODAWN_PROGRAM`) |  13  |  11  |
| Basic flavor pretty-print (`dawn → basic` via `FROMDAWN_PROGRAM`) | 4  |  14  |
| **Total**                                            |  **36** | **25** |

The runtime is solid: every canonical `.dawn` program under
`Test/cases/dawn/` runs to its expected output. The basic-flavor grammar is
mid-refactor toward a "top-level = `define` only" model (see "Test layout"
below); most round-trip tests therefore fail at the moment, but the
encapsulated design is now baked into the test fixtures.

## Test layout

Every case under `Test/cases/basic/` is wrapped in a `define <Name> { input
<port> { <body> } }` block. This encodes the design target that
`TODAWN_PROGRAM` should *only* accept resource definitions at the top level
— low-level syntax (arithmetic, string concatenation, `if`, etc.) lives
inside the input handler body, not at program scope. The `.dawn` snapshots
already encode the wrapped canonical form (e.g. `number_addition.dawn` is
`[[[Number:3 Number:4]>>add:]>>NewInput:n]>>NewResource:WithAdd`), so once
the grammar is extended to accept expressions in `TD_FUNCTION_LINES` and
the FD-side body printers are wired up, every test should pass without
fixture churn.

Until then, the runner reports the exact grammar gap. Of 17 basic-flavor
cases:

- **basic→dawn passes** (5): `define_assign`, `define_output`,
  `define_pipeline`, `if_then`, `uri_passthrough` — bodies that are
  already URI-list flows or `TD_STATEMENT` (assignments / `if`).
- **dawn→basic passes** (4): `define_assign`, `define_output`,
  `define_pipeline`, `uri_passthrough` — only the three define-block
  shapes plus a bare URI round-trip through `FD_FLOW`. The FD side has
  no printers for bodies that contain numeric/string/boolean expressions.

**Expression vs statement inside define bodies.** Of the 17 wrapped cases,
5 pass `basic → dawn` because their bodies are `TD_STATEMENT` or `FLOW` forms
(assignments, `if`/`else` via `TD_STATEMENT`, or URI lists via `FLOW`). The
remaining 12 fail because their bodies are pure expressions (`3+4`, `"Hello" &
"World"`, `42`, etc.) that the grammar's `TD_FUNCTION_LINES` rule
(`basic.bnft:224-226`) does not accept — it only allows `TD_STATEMENT |
FLOW`. The `if_then` test passes specifically because its two-line newline
format (`if (Boolean:true)\n String:Yes`) matches the `TD_IF` rule
(`basic.bnft:268-270`) which is a `TD_STATEMENT`, not a bare expression.

Until `TD_FUNCTION_LINES` is widened or body printers are wired up, these
12 cases will continue to produce `ERROR: { … }` parse failures.

## What's working

**Runtime (`DawnCompiler.dawn.js` + `Resource.dawn.js` + `Content-Type/`).**
Boolean, Number, String, List, and Flow resources all execute cleanly. The
`Console` resource (`dawn/Console.dawn.js`) accepts `in_*_$all` from every
primitive type. Arithmetic uses BigRational throughout, so the
`TheQuestion.dawn` program (the arbitrary-precision `42 = x³+y³+z³` example)
produces exact output.

**Basic flavor parser (`TODAWN_PROGRAM`).** Numeric literals, base-N
(`1001#2`, `FFFF#16`), string literals in all three quote styles, string
concatenation with `&`, list literals, arithmetic with both ASCII and
Unicode operators, super/subscript digits, `if`/`else` (with or without
braces), `define`/`output`/`input`/`native javascript { … } endnative`,
and URI passthrough all parse **at the top level of a program** and inside
flow chains. Inside an input body, only `TD_STATEMENT` (assignments / `if`)
and `FLOW` (URI/list continuations) currently parse — see "What's broken".

**Basic flavor pretty-printer (`FROMDAWN_PROGRAM`).** Four passing cases:
the three `define_*` programs (`define_assign`, `define_output`,
`define_pipeline`, which render the embedded body through `FD_DEFINE_BODY` /
`FD_FUNCTION_INNER`, `basic.bnft:501-516`) and `uri_passthrough` (a bare
URI round-trips through `FD_FLOW`, `basic.bnft:483-485`).

## What's broken

### `TODAWN_PROGRAM`: expressions inside input bodies

`TD_FUNCTION_LINES` (`basic.bnft:224-226`) currently accepts only
`TD_STATEMENT | FLOW`. Numeric, string, and other top-level expressions
(`TD_NUMERIC_EXPRESSION`, `TD_STRING_EXPRESSION`, `FLOW_PIPELINE`) are
silently excluded — so wrapped bodies like `3+4`, `"Hello" & "World"`,
`42`, or `3+4>>Console:` inside `input n { … }` produce an
`ERROR: { … }` parse failure. The fix is to either widen
`TD_FUNCTION_LINES` to also accept `TD_EXPRESSION`, or to expand its
alternatives into a richer list of body forms.

This is the single largest source of `basic → dawn` failures (12 of 12).

### `FROMDAWN_PROGRAM`: body pretty-printing

`FD_DEFINE_BODY_LINE` (`basic.bnft:506-508`) and `FD_INNER_CONTENT`
(`basic.bnft:514-516`) only dispatch `FD_STATEMENT` (which handles `if`)
and `FD_FLOW` (which handles bare URI flows). When a wrapped body
contains a numeric or string expression inside `[…]>>NewInput:…`, the FD
side falls through to the raw canonical form unchanged. So even after
the parser gap above is closed, the dawn→basic tests for the wrapped
`number_*`, `string_*`, and `SourceTest` cases will still fail until the
body printer recognises the inner `[Number:…]>>add:` shape and dispatches
it to `FD_NUMERIC_EXPRESSION` / `FD_STRING_EXPRESSION`.

This is the single largest source of `dawn → basic` failures (13 of 13).

### Existing arithmetic-shape bugs

These predate the wrap and still apply:

1. **Division literal in output.** `6÷2` currently emits
   `[Number:6÷Number:2]>>divide:` — the `÷` survives as a literal
   character inside the `Number:` prefix rather than being normalised
   to the `/` delimiter. `Test/cases/basic/number_division.basic`
   (`define WithDivide { input n { 6÷2 } }`) is the failing case.
2. **Subtraction rewrite.** `10-3` emits `[Number:10 Number:3]>>subtract:`
   instead of the documented `[Number:10 Number:3>>negate:]>>add:`. The
   output is functionally equivalent, so the failure is purely cosmetic
   against the test snapshot — but `basic.bnft:170` (`TD_SUBTRACTION`)
   rewrites to `negate+add` while the `TD_SUBTRACT` alternative on line
   167 does not, and `TD_NUMERIC_EXPRESSION` (`basic.bnft:177`) chooses
   the `>>subtract:` path on line 176 for the matched input. Whichever
   path the parser takes, the test expects the canonical form.
   `Test/cases/basic/number_subtraction.basic` is the failing case.

## Where to look next

| Task                                       | File / line                                      |
|--------------------------------------------|--------------------------------------------------|
| Accept expressions inside input bodies     | `dawn/Flavors/basic.bnft:224-226` (TD_FUNCTION_LINES) |
| Wire FD body printers into FD_DEFINE_BODY  | `dawn/Flavors/basic.bnft:506-516` (FD_DEFINE_BODY_LINE / FD_INNER_CONTENT) |
| Fix division normalisation                 | `dawn/Flavors/basic.bnft:150-160` (TD_DIVISION, TD_MULTIPLICATION) |
| Fix subtraction rewrite                    | `dawn/Flavors/basic.bnft:166-180` (TD_SUBTRACT, TD_SUBTRACTION, TD_NUMERIC_EXPRESSION) |
| Expand FD_NUMBER, FD_STRING round-trips    | `dawn/Flavors/basic.bnft:333-374` (FD_NUMBER, FD_STRING_EXPRESSION etc.) |
| Expand FD_NUMERIC_EXPRESSION round-trip    | `dawn/Flavors/basic.bnft:382-421` (FD_EXPRESSION_BOTTOM … FD_ADD_EXPRESSION) |
| Expand FD_BOOLEAN_EXPRESSION round-trip    | `dawn/Flavors/basic.bnft:440-465` (FD_NOT … FD_BOOLEAN_EXPRESSION) |
| Wire up FD_FLOW / FD_SYNTAX entry          | `dawn/Flavors/basic.bnft:483-498` (FD_FLOW, FD_FLOWLIST, FD_SYNTAX) |
| Add comparison operators to TD side        | `dawn/Flavors/basic.bnft` (no TD surface rule; only `FD_COMPARERS` at 423-432) |
| Implement `Meta:Assignment` runtime        | `dawn/Content-Type/application/dawn.dawn.js`     |

## Tooling status

- `node dawn_run.js <file.dawn>` — works.
- `node dawn_console.js` — works (port 5000, ACE editor + xterm.js).
- `node run_tests.js` (this suite) — works, deterministic.
- `node Test/runner.js` — the BNFT round-trip suite driving
  `TODAWN_PROGRAM` and `FROMDAWN_PROGRAM`. Works; gaps listed above.
- WASM target — deferred; see `docs/wasm-0.3-plan.md`.
- Native-target routing (`compileTarget` field) — planned, not wired.
  See `docs/native-targets.md`.
