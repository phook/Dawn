# Dawn Basic Flavor — Syntax Reference

The **basic flavor** is one of several surface-syntax styles Dawn supports. It is
the natural-looking style most existing examples use (`.dawn_basic` files such
as `dawn/Clock.dawn_basic`, `dawn/times.dawn_basic`, and
`public/codeexamples/Basic.dawn_basic`). It compiles to canonical Dawn source
(the same `.dawn` form executed by `dawn_run.js`).

This document describes the language as it stands today: every construct listed
here is exercised by the test suite under `Test/cases/basic/` and parses via
the grammar in `dawn/Flavors/basic.bnft` (which `#include`s
`dawn/Flavors/shared.bnft`).

## 1. Conceptual model

Dawn's runtime model is unchanged by the flavor. Two facts do most of the work:

- **Everything is a URI.** A literal like `String:Hello` is a URI whose scheme
  is `String` and identifier is `Hello`. The runtime resolves it to a resource
  and constructs an instance.
- **Flows connect outputs to inputs with `>>`.** The whole language is built
  out of these bindings. The basic flavor adds concrete syntax for arithmetic,
  control flow, and resource definitions, but each is rewritten to a flow.

The compiler/parser is bidirectional. Both directions are defined in
`dawn/Flavors/basic.bnft`:

| Direction | BNFT entry (line) | Effect |
|-----------|-------------------|--------|
| Source → Dawn (parse) | `TODAWN_PROGRAM` (`basic.bnft:532-533`) | `.dawn_basic` → `.dawn` |
| Dawn → Source (pretty-print) | `FROMDAWN_PROGRAM` (`basic.bnft:529-530`) | `.dawn` → `.dawn_basic` |

`Test/runner.js` parses each `.basic` under `Test/cases/basic/` in both
directions. Every test case is wrapped in a `define <Name> { input <port> {
<body> } }` block so that low-level syntax (arithmetic, string
concatenation, `if`, …) lives inside an input handler body rather than at
program scope. Coverage is partial: of 17 cases, 5 pass basic→dawn and 4
pass dawn→basic. See `docs/progress.md` for the live numbers and the two
grammar gaps that explain the remaining failures.

## 2. Top-level structure

A basic-flavor program is a sequence of statements. The grammar applies
`#significantwhitespace` preprocessing at the `TODAWN_PROGRAM` entry
(`basic.bnft:533`) so indentation matters: a deeper indentation opens a
block, and a return to a shallower level closes it.

Three kinds of top-level statement are currently allowed by `TD_SYNTAX`
(`basic.bnft:518-521`):

```
TODAWN_PROGRAM  := { TD_DEFINITION | TD_EXPRESSION | FLOW }
```

While the grammar still supports all three alternatives at program top level,
the test fixtures are being progressively migrated so that low-level syntax
only appears inside `define … input { … }` bodies. This is a design target
rather than a current parser limitation; the BNFT grammar in
`dawn/Flavors/basic.bnft` presently allows all three alternatives, and
wrapping tests in `define` blocks merely documents the intended evolution
path.

- `TD_DEFINITION` — a `define` block that introduces a new resource
  (see § 9).
- `TD_EXPRESSION` — a single statement, which may itself be an `if`, a
  pipeline, an assignment, a numeric/string/boolean expression, or a URI.
- `FLOW` — a top-level URI optionally followed by `>>`-chains.

## 3. URIs and binding

The URI rule (`shared.bnft:63`) is the alphabet of identifiers Dawn accepts
(`URI := ALPHA { XALPHA }`, with `XALPHA` defined on line 57):

```
URI := ALPHA { XALPHA }
XALPHA := ALPHANUMERIC | SAFE | EXTRA | ESCAPE
SAFE   := $ - _ @ . & : # = ?
EXTRA  := ! * " ' | , ( ) /
ESCAPE := % HEX HEX          (URL-style percent encoding)
```

Anything that begins with a letter and contains only `URI` characters is a
URI. Schemes (`String`, `Number`, `Boolean`, `http`, `file`, `smtp`, …) are not
a reserved set — the URI prefix is the scheme and the runtime decides what it
means.

Bindings use `>>` (`basic.bnft:33`, the `FLOWEND` rule). The grammar accepts a
list on the left and a URI, flow, or list on the right, recursively.

Examples:

```
String:Hello>>Console:
String:Hello>>Tester:>>Console:
[Number:1 Number:2]>>add:>>Console:
Boolean:true>>Boolean.if:?#go_then>>String:Yes
```

The selectors visible above — `?input=…` and `#output=…` — are part of the URI
parser in `Resource.dawn.js:181-195` and are preserved verbatim by the
basic flavor.

## 4. Numbers

Numeric literals are arbitrary-precision (BigRational). Five forms are
accepted (`basic.bnft:91-94`):

| Form            | Example       | Compiles to          |
|-----------------|---------------|----------------------|
| Integer         | `42`          | `Number:42`          |
| Scientific      | `1.5e2`       | `Number:1.5e2`       |
| Base-N integer  | `1001#2`, `FFFF#16` | `Number:1001#2`, `Number:FFFF#16` |
| Subscript base  | `1001₂`       | `Number:1001#2`      |
| `Number:` prefix passthrough | `Number:1_000_000` | (unchanged; any URI body, including `_` separators) |

The bare-numeric path is `TD_NUMBER_INTEGER` (`basic.bnft:85-86`), whose
digit class `TD_DIGIT` accepts only `0-9A-Fa-f`. Underscore separators are
**not** part of `TD_DIGIT`, so `1_000_000` only parses through the
`Number:` prefix passthrough alternative (`basic.bnft:94`); the bare form
`1_000_000` falls through to URI syntax and is not parsed as a number.

**Super- and subscript exponents.** Real Unicode digits are recognised and
expand into power expressions (`basic.bnft:105-118`, the `TD_DIGITS_SUPER`
and `TD_NUMBER_SUPER` rules):

```
2³    -> [Number:2 Number:3]>>power:
2⁴⁵  -> [Number:2 Number:45]>>power:
```

Subscript digits (`₀₁…`, `basic.bnft:121-134`) are accepted as a base
suffix; the canonical emit uses them after `#`.

**Arithmetic operators** — precedence spans `TD_PRIMARY` through
`TD_NUMERIC_EXPRESSION` (`basic.bnft:101-180`): power > unary > mult/div >
add/sub. Both ASCII and Unicode operator forms are accepted:

```
+ - * / ^         (ASCII; "-" inside expressions = ASCII hyphen-minus)
× ÷               (Unicode)
```

Multi-operand chains desugar to a list on the left and a typed resource on
the right:

```
3+4           -> [Number:3 Number:4]>>add:
3×4           -> [Number:3 Number:4]>>multiply:
2^3           -> [Number:2 Number:3]>>power:
```

Unary minus desugars to `>>negate:` via the first alternative of `TD_PRIMARY`
(`basic.bnft:102`).

**Subtraction and division are special.** The grammar has two competing
alternatives for `-`, and the parser currently picks the `TD_SUBTRACT`
alternative (`basic.bnft:166-167`) which emits `>>subtract:` directly, not
the `TD_SUBTRACTION` (`basic.bnft:169-170`) path that the round-trip suite
expects — which would rewrite the right operand through `>>negate:` and
fold the result into `>>add:`:

```
Doc/canonical:    10-3 -> [Number:10 Number:3>>negate:]>>add:    (TD_SUBTRACTION,
                                                               basic.bnft:169-170,
                                                               then TD_NUMERIC_EXPRESSION
                                                               at line 179)
Parser actually   10-3 -> [Number:10 Number:3]>>subtract:       (TD_SUBTRACT path,
emits:                                                   basic.bnft:177)
```

`number_subtraction` is the live failing case; see `docs/progress.md`.

Division has a parallel issue. `TD_DIVISION` (`basic.bnft:150-151`) emits
`>>reciprocate:` (single-operand reciprocal), while `TD_MULTIPLICATION`
(`basic.bnft:157-160`, the `TD_DIV`/`TD_DIVISION` alternatives) emits
`>>divide:` for the two-operand case. The Unicode `÷` survives the
`TD_DIGIT` alphabet of `TD_NUMBER` and ends up embedded inside the
`Number:` literal:

```
Canonical target: 6÷2 -> [Number:6 Number:2]>>divide:
Parser actually   6÷2 -> [Number:6÷Number:2]>>divide:    (the ÷ becomes part
emits:                                             of the Number: body)
```

`number_division` is the live failing case; see `docs/progress.md`.

## 5. Strings

A string literal is a quoted run of letters, digits, and spaces; the contents
are URI-encoded by `TD_STRING_LITERAL` (`basic.bnft:61-62`). `TD_STRING`
(`basic.bnft:64-68`) emits a `String:` URI and is also where bare URIs pass
through. Three quote styles are accepted:

```
"Hello"      (straight double)
'Hello'      (straight single)
“Hello”      (typographic "smart" quotes — U+201C … U+201D)
```

The literal `String:Hello%20World` is the canonical form of `“Hello World”`:
on the FromDawn side `FD_EXP_STRING` (`basic.bnft:357-358`) decodes the
encoded body and wraps it in typographic quotes.

**Concatenation** uses `&` (`basic.bnft:73-74`, the `TD_STRING_CONCATENATION`
rule). It compiles to a list literal bound to `concatenate:`:

```
"Hello" & "World"     -> [String:Hello String:World]>>concatenate:
```

## 6. Booleans

Boolean constants are URIs: `Boolean:true` and `Boolean:false`. The
`Boolean:not`, `Boolean:and`, `Boolean:or`, and `Boolean:if` resources live
under `dawn/Content-Type/data/Boolean/`.

**Boolean expressions** are built with three interchangeable operator sets
(`basic.bnft:182-202`):

```
&& and ∧ AND_      logical AND — ASCII / Unicode / ASCII word (with trailing space)
|| or  ∨ OR_       logical OR  — ASCII / Unicode / ASCII word
!  not ¬ NOT_       logical NOT — ASCII / Unicode prefix / ASCII word (with trailing space)
```

The word operators carry their trailing whitespace as part of the token
(`basic.bnft:187`, `190-191`, `197-198`), so `NOT x` parses but `NOTx`
does not.

Precedence: `or < and < not < atom`, matching C/Python habits. The
`TD_BOOLEAN_BOTTOM` rule (`basic.bnft:182-184`) accepts parenthesised
boolean expressions and bare identifiers (an undefined identifier is a
late-resolved URI).

**Comparisons** are not yet emitted by the basic flavor grammar in source
mode. The `FD_COMPARERS` table (`basic.bnft:423-429`) exists on the
FromDawn side for *printing* `>` / `>=` / `<` / `<=` / `=` / `≠`, and
`FD_COMPARE_EXPRESSION` (`basic.bnft:431-432`) wires it up on that
side — but there is no surface syntax yet (no `TD_*` rule for `>`, `>=`,
`==`, etc.). They round-trip only when present in Dawn source as the
underlying `greater:` / `greaterEqual:` / `equal:` / `notEqual:`
resources. Note: a typo on `basic.bnft:426` makes `less:` print as ` > `;
the rule should read `less:` → ` < `.

## 7. List literals

Lists are written with brackets and whitespace separation
(`basic.bnft:37-44`, the `FLOWLISTEND`/`INNER_FLOWLIST`/`FLOWLIST` rules).
Inside the brackets, multiple flows are concatenated:

```
[Number:1 Number:2]              two-element list
[String:Hello String:World]      two-element list
```

Lists are themselves Resources; binding a list to an operation's input port
becomes a positional argument list (`>>add:`, `>>concatenate:`, …).

## 8. Conditional expressions

`if` and `else` are surface syntax over `Boolean:if`'s `go_then` and
`go_else` outputs (`basic.bnft:268-278` — `TD_IF` and `TD_IF_ELSE`;
the underlying resource lives at `dawn/Content-Type/data/Boolean/if.dawn.js`).

**Single form:**

```
if (Boolean:true) String:Yes
```

compiles to:

```
Boolean:true>>Boolean.if:?#go_then>>String:Yes
```

**With `else`:**

```
if (Boolean:true) String:Yes else String:No
```

compiles to:

```
Boolean:true>>Boolean.if:?#go_then,go_else>>[String:Yes String:No]
```

Brace form `if (cond) { … } else { … }` is also accepted, and significant
whitespace handles the block body. The body lines inside `{ }` are joined by
recursive `>>` chaining.

## 9. Resource definitions: `define`

`define Name { … }` introduces a new resource at the top level
(`basic.bnft:256-257`). The body contains zero or more:

- `output Name` — declares an output port (`NewOutput:`).
- `input [all] Name { … }` — declares an input port (`NewInput:`). The
  optional `all` keyword (`basic.bnft:236-238`) maps to `_$all`, the
  catch-all marker — the port doesn't disappear when bound.
- `native javascript { … } endnative` — inline JS body
  (`basic.bnft:250-251`), URI-encoded into `Native.Javascript:`.

The body lines desugar to a nested `[...]>>NewResource:Name` flow. From
`Test/cases/basic/define_output.basic`:

```
define WithOutput
 output out1
```

compiles to:

```
[NewOutput:out1]>>NewResource:WithOutput
```

A more complete example (`Test/cases/basic/define_assign.basic` → `…/define_assign.dawn`):

```
define WithAssign
 input inp1
  [out1input]
```

compiles to:

```
[[[out1input]]>>NewInput:inp1]>>NewResource:WithAssign
```

The body of an `input` block is itself a flow (or list of flows), so the
input handler's logic is just a Dawn pipeline.

**Real-world `define` example.** `dawn/times.dawn_basic`:

```
define times
  output go
  input all number
    native javascript
      if (this._out_go)
        while (number._value.greater(0,1))
          number._value = number._value.subtract(1,1)
          this._out_go()
    endnative
```

Notes:

- `input all number` declares a catch-all Number input (`_$all`).
- The body of the `input` block carries one pipeline element: a `native
  javascript { … }` block. The native block is URI-encoded and becomes a
  `Native.Javascript:` resource instance on the right-hand side of the
  enclosing `>>NewInput:` flow.
- The JavaScript inside `native javascript { … }` runs in the resource's
  processor scope. `_in_*`, `_out_*`, and `_value` are conventional
  accessors on the processor.

## 10. Native blocks: JavaScript interop

The `native` keyword introduces a host-language body
(`basic.bnft:214-219` for the generic `TD_CHAR`/`TD_NATIVE`/`TD_END_NATIVE`
machinery, `basic.bnft:250-251` for the `native javascript` block form).
Today only `javascript` is recognised:

```
native javascript
  <js source>
endnative
```

The body is captured verbatim, URI-encoded, and bound to `Native.Javascript:`.
The runtime evaluates it through `dawn/Native/Javascript.js` when the input
fires.

`native` blocks are the same shape whether they appear at `define` scope or
inside an `input { … }` handler — the grammar does not distinguish the two,
only the surrounding context changes how the result is wired up.

## 11. Assignments and identifiers

A leading identifier followed by `:=` (or `≔`) starts an assignment
(`basic.bnft:204-207`, the `TD_ASSIGNMENT` rule). The right-hand side can be
a boolean, string, or numeric expression:

```
counter := 0
name    := "Dawn"
ready   := Boolean:true
```

Assignments compile to `Meta:Assignment>>…>>identifier` flows. The runtime
side of `Meta:Assignment` is not currently implemented (the grammar emits
the form but there is no resource to receive it yet — see
`docs/dawn-vs-component-model.md` § 6).

## 12. `Meta:` and reserved prefixes

A leading `Meta:` token in source is consumed and discarded by the parser
(`basic.bnft:53`, the third alternative of `FLOW`). Today the grammar only
recognises `Meta:` as a prefix that gets dropped. Future flavours will hang
meta-level constructs (the assignment resource, import directives, target
selectors, etc.) off this prefix; it is the surface convention for "this
token names something the runtime handles, not a regular resource."

## 13. Pretty-printed form (Dawn → Basic)

The grammar's other half — `FROMDAWN_PROGRAM` and its `FD_*` rules — emits
basic-flavor source from canonical Dawn. It is intended to be the inverse
of the parser and is used by tooling that wants to display a Dawn program
in the natural-looking form.

Key transforms the FD rules express:

| Dawn source                              | Basic flavor (target)                        |
|------------------------------------------|-----------------------------------------------|
| `Number:42`                              | `42`                                          |
| `Number:3 #10` / `Number:FFFF #16`       | `3` / `FFFF#16` (subscript base indicator)    |
| `Number:2 #10` with superscript `Number:3` (`>>power:`) | `2³`                       |
| `String:Hello%20World`                   | `"Hello World"`                               |
| `[String:A String:B]>>concatenate:`      | `"A" & "B"`                                   |
| `[Number:3 Number:4]>>add:`              | `3+4`                                         |
| `[Number:3 Number:4]>>multiply:`         | `3×4`                                         |
| `[Number:6 Number:2]>>divide:`           | `6÷2`                                         |
| `[Number:10 Number:3>>negate:]>>add:`    | `10-3`                                        |
| `[X Y]>>subtract:`                       | `X-Y`                                         |
| `Boolean:true>>Boolean.if:?#go_then>>A`  | `if (Boolean:true) A`                        |
| `Boolean:true>>Boolean.if:?#go_then,go_else>>[A B]` | `if (Boolean:true) A else B`       |
| `Meta:Assignment>>X Y`                   | `X := Y` (`FD_ASSIGNMENT`, `basic.bnft:472-473`) |
| `[NewOutput:out1]>>NewResource:Name`     | `define Name\n output out1`                  |
| `[Body]>>NewInput:Name`                  | `input Name\n Body`                          |

**Current round-trip status** (verified by `node Test/runner.js`):

Only four dawn → basic cases currently pass: `define_assign`,
`define_output`, `define_pipeline`, and `uri_passthrough`. The `if`/`else`
print rules (`FD_IF_THEN`, `basic.bnft:348-349`; `FD_IF_ELSE`,
`basic.bnft:351-352`) exist but the live test runner still emits the raw
`Boolean.if:?#go_then>>…` form — `basic/if_then` fails. Bare number
literals, list-bound arithmetic (`add`/`multiply`/`divide`/`negate`),
string literals and concatenation all currently produce the canonical
Dawn form unchanged rather than the surface form, so the `number_*`,
`string_*`, and `SourceTest` cases fail. Counts and the failing cases are
tracked in `docs/progress.md`. The remaining work is wiring every TD/`<form>`
up to a matching FD/`<form>` in the `FROMDAWN_PROGRAM` entry
(`basic.bnft:529-530`).

## 14. File extension and parser entry

- Source files use the extension `.dawn_basic` so the toolchain can pick the
  right grammar entry.
- Compiled canonical source is `.dawn` and is what `dawn_run.js` and
  `dawn_console.js` actually execute.
- The grammar file is `dawn/Flavors/basic.bnft`, with character classes from
  `dawn/Flavors/shared.bnft`. The entry for parsing is `TODAWN_PROGRAM`
  (line 532); the entry for printing is `FROMDAWN_PROGRAM` (line 529).
  Lines 1-516 contain the individual `TD_*` / `FD_*` rules.
- The test runner (`Test/runner.js`) compiles each `.basic` under
  `Test/cases/basic/` to `.dawn` via `TODAWN_PROGRAM`, then attempts the
  reverse via `FROMDAWN_PROGRAM` to validate round-trip parity.

## 15. Quick-reference card

```
program    := { define | expression | flow }
define     := 'define' URI { output | input | native }
output     := 'output' URI
input      := 'input' [ 'all' ] URI { flow }
native     := 'native' 'javascript' { js source } 'endnative'
expression := if | number | string | boolean | uri
if         := 'if' '(' uri ')' expression [ 'else' expression ]
uri        := scheme ':' identifier
flow       := uri { '>>' (uri | flow | list) }
list       := '[' [ flow { ws flow } ] ']'
number     := digits [ '#' base ] | scientific | super-exponent
string     := '"' … '"' | "'" … "'" | "“" … "”"
concat     := string ( '&' string )*
boolean    := 'Boolean:true' | 'Boolean:false' | not | and | or
assign     := identifier ( ':=' | '≔' ) expression
operators  := + - × * ÷ / ^  (arithmetic)
              && and AND ∧  (logical AND)
              || or OR ∨    (logical OR)
              ! not NOT ¬   (logical NOT)
```
