# Dawn Project Progress

Snapshot of the runtime and toolchain status. Numbers come from running
`node Test/runner.js` on the working tree; details of each case live in
`Test/cases/dawn/` and `Test/cases/basic/`.

## Headline

| Suite                                                       | Pass | Fail |
|-------------------------------------------------------------|-----:|-----:|
| Dawn execution (`dawn_run.js` against `.dawn`)               |  26  |   0  |
| Basic flavor parse (`basic → dawn`, incl. `prompt_*` lanes)  |  22  |   0  |
| Basic flavor pretty-print (`dawn → basic`, incl. prompt)     |  21  |   0  |
| Documentation `@example` execution                           |  55  |   0  |
| Integration (`Test/integration/`)                            |   3  |   0  |
| **Total**                                                    | **137** | **0** |

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

1. **Mixed-chains**: `1 + 2 - 3` doesn't parse (only all-`+`, all-`-`, all-`*`,
   all-`/` chains). Canonical nested form should be `[[1 2]>>add: 3]>>subtract:`.
2. **Bare expressions in define bodies**: `input n { 3+4 }` still fails —
   widened `TD_FUNCTION_LINES` caused ambiguity regressions; needs the
   statement/expression split cleaned up.
3. **Comparisons in TD**: FD_COMPARERS exists (pretty-print), but no TD side.
4. **Native blocks with braces in content or at program top level**: the
   `#significantwhitespace` program preprocessing mangles literal `{`/`}` that
   native javascript needs; works inside define bodies only for simple content.
5. **`Meta:Assignment` runtime** (identity/scope for `≔`), `Identifier:`/
   `loop:`/`clock:` (deferred by user to Phase 2/3).
6. **UIL pages as sources** — Phase 5.

## Tooling status

| Tool | Status |
|---|---|
| `node Test/runner.js` | 137/0 today, snapshots enforced |
| `node build_docs.js` | regenerates `docs/api/` from `Meta.documentation:` blocks |
| `node build_sources.js` | rebuilds stale `.dawn.js` from `.dawn` sources (hidden, timestamp-stamped) |
| `node dawn_run.js <x.dawn>` | works |
| `node dawn_console.js` | web IDE works; keyboard fixed 2026-09-03 (pinned jQuery/jquery.terminal, textarea input) |
| editor.html | works; hidden `.dawn.js` artifacts don't confuse it (they're never edited) |

## See also

- `ROADMAP.md` — phases 0–7 and what each closes with.
- `library.md` — every resource, its ports, its test status.
- `basic-flavor-syntax.md` — the flavor's meaning (will be regenerated as the
  grammar work lands).
- `output-interfaces.md` — deferred pin/plug interface design.
- `documentation-standard.md` — the documentation system conventions.
