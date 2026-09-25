# Dawn Project Progress

Snapshot of the runtime and toolchain status. Numbers come from running
`node Test/runner.js` on the working tree; details of each case live in
`Test/cases/dawn/` and `Test/cases/basic/`.

## Headline

| Suite                                                       | Pass | Fail |
|-------------------------------------------------------------|-----:|-----:|
| Dawn execution (`dawn_run.js` against `.dawn`)               |  49  |   0  |
| Basic flavor parse (`basic → dawn`, incl. `prompt_*` lanes)  |  21  |   0  |
| Basic flavor pretty-print (`dawn → basic`, incl. prompt)     |  21  |   0  |
| Documentation `@example` execution                           |  48  |   0  |
| Integration (`Test/integration/`)                            |   2  |   0  |
| **Total**                                                    | **141** | **0** |

## What changed 2026-09-22 (blob→octetstream + editor/flavor pipeline)

**Blob is gone; binary = `application/octetstream`.** The old universal
`Content-Type/data/Blob` resource was deleted and replaced by a resource named
`octetstream` living at `dawn/Content-Type/application/octetstream.dawn` —
the true `application/octet-stream` fallback in `Scheme/cast`. The binary
transport ports on every value resource (`String`, `Number`, `Boolean`,
`Data`, `List`, `text`, `image`, `json`, `Console`, `file:`) are now
`in_octetstream_$all` / `out_octetstream`; Console prints `octetstream(N bytes)`.
`image/*` resolves to the real `Content-Type/image` family resource, which now
endpoints into octetstream bytes.

**Editor BasicPretty is now a real view, not a decoration.** The editor
(`public/editor.html`) converts canonical `.dawn` ↔ basic form via the flavor
grammar on load, on save and on every flavor switch — no regex fallbacks, no
silent file writes:

- `#doc …` lines ↔ `Meta.documentation:` lines round-trip in both
  `TD_SYNTAX_PATHS` (to-dawn) and `FD_DOC` (from-dawn); plain `#` comments map
  to `Meta.Comment:>>`.
- Native blocks: first-line indentation is no longer eaten by the separator
  (new `TD_EOL` rule), `%`-leading and empty payloads decode correctly
  (`FD_NATIVE_PAYLOAD`), and `define`-level bodies with nested `{`/`}`
  round-trip byte-identical (raw-block markers on `#significantwhitespace`).
- `removeMeta.bnft` (in `dawn/Flavors/`) strips Meta statements before the
  compiler sees the check source; docs/comments are metas that are simply
  ignored downstream. Saved content always keeps the metas.
- Editing protection: debounced syntax check drives tab color *and* control
  state — red tab ⇒ flavor selector + Save disabled, immediate re-check on
  switch attempts so an error can never be converted/lost mid-flight.
- Save plumbing fixed: editor content is actually converted and sent; a
  conversion or compile failure refuses the write instead of truncating the
  file to empty.

## What changed 2026-09-03 (Phase 2 kickoff)

**Round-trip is the law now.** The four known grammar failures are gone:

- **Subtraction is canonical**: `-` chains lower to `[a b c]>>subtract:` —
  no more `negate`+`add`. Division chains use `>>divide:` consistently.
- **Arithmetic chains work**: `1 + 2 + 3`, `10 - 3 - 2`, `2 * 3 * 4`, `8 / 2 / 2`
  all lower to flat `[…]>>op:` (tail rules absorb leading whitespace — that was
  the chain-breaking defect).
- **Command prompt accepts bare expressions** (`12+3`, `"a" & "b"` at the
  terminal) — `TODAWN_COMMANDPROMT` now accepts `TD_EXPRESSION` *and* plain
  `FLOW` (canonical passthrough).
- **Native blocks ride along in define**: `define X { … native javascript { … }
  endnative … }` now emits `[ Native.Javascript:<encoded> … ]>>NewResource:X`
  (the constructor capture was wired to empty before; now it's the first body
  element).
- **if/else fixed**: duplicate FD rules removed; the surviving pair
  (`basic.bnft` FD_IF_THEN/FD_IF_ELSE) round-trips both brace-and-braceless
  forms stably (trailing-space corpus bug in `if_then.basic` fixed too).
- **Grammar hygiene**: no duplicate nonterminals left; TD_SUBTRACTION /
  TD_DIVISION (the negate+add / reciprocate oddities) deleted.

Snapshots: the previous expected files were generated from an older, lossy
grammar and have been regenerated (`Test/runner.js --update`).

**Lanes in `Test/cases/basic/`**: normal files drive `TODAWN/FROMDAWN_PROGRAM`;
`prompt_*.basic` drive the command-prompt nonterminals (console grammar).

## Known remaining gaps (Phase 2 continuation, by priority)

1. **Mixed chains**: `1 + 2 - 3` doesn't parse (same-op chains only).
2. **Comparisons in TD**: FD side only; `3 > 2`, `3 < 2` don't parse in a
   basic program.
3. **Native blocks at program top level**: work inside `define` bodies
   (braces survive now); top-level raw blocks and blank-line normalization
   edge cases remain.
4. **`Identifier:`/`loop:`/`clock:`** (deferred by user to Phase 2/3).
5. **UIL pages as sources** — Phase 5.
6. **`check_grammar.js` hygiene**: duplicate-free now; two stale definitions
   (`URI1`, `URI2`) unused.

Resolved-not-issues (recorded 2026-09-22):
- *Bare expressions in define bodies* (`input n { 3+4 }`): **not a gap** —
  Dawn has no return values; every value must flow to an output. A bare
  expression in a body has nowhere to go and rightly fails.
- *`Meta:Assignment` runtime*: **no runtime semantics needed** — it is a
  canonical hint for flavors: the basic view prints `Meta:Assignment>>expr>>x`
  as `x ≔ expr`; plain `expr>>x` stays a plain flow. There is nothing to
  implement at runtime.

## Tooling status

| Tool | Status |
|---|---|
| `node Test/runner.js` | 141/0 today, snapshots enforced |
| `node build_docs.js` | regenerates `docs/api/` from `Meta.documentation:` blocks (56 pages) |
| `node build_sources.js` | rebuilds stale `.dawn.js` from `.dawn` sources (hidden, timestamp-stamped) |
| `node dawn_run.js <x.dawn>` | works |
| `node dawn_console.js` | web IDE works; keyboard fixed 2026-09-03 (pinned jQuery/jquery.terminal, textarea input) |
| editor.html | works; hidden `.dawn.js` artifacts don't confuse it (they're never edited) |
| `node check_grammar.js` | no duplicate nonterminals; two unused definitions flagged (`URI1`, `URI2`) |

## See also

- `ROADMAP.md` — phases 0–7 and what each closes with.
- `library.md` — every resource, its ports, its test status.
- `basic-flavor-syntax.md` — the flavor's meaning (will be regenerated as the
  grammar work lands).
- `output-interfaces.md` — deferred pin/plug interface design.
- `documentation-standard.md` — the documentation system conventions.
