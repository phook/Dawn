# Dawn Project Progress

Snapshot of the runtime and toolchain status. Numbers come from running
`node Test/runner.js` on the working tree; details of each case live in
`Test/cases/dawn/` and `Test/cases/basic/`.

## Headline

| Suite                                                       | Pass | Fail |
|-------------------------------------------------------------|-----:|-----:|
| Dawn execution (`dawn.js` against `.dawn`)                   |  49  |   0  |
| Basic flavor parse (`basic → dawn`, incl. `prompt_*` lanes)  |  21  |   0  |
| Basic flavor pretty-print (`dawn → basic`, incl. prompt)     |  21  |   0  |
| Documentation `@example` execution                           |  48  |   0  |
| Integration (Test/integration/)                            |   5  |   0  |
| **Total**                                                    | **168** | **0** |

## What changed 2026-10-23 (port-name grammar: type chains + mandatory names)

**Ports are now `in|out_<type...>_<name>_<marker?>`.** The tokens before the last are
the type chain, general to specific; the name is mandatory ("default" is the
reserved anonymous name); markers ride as suffixes. Connection matching is the
subtype rule — an input connects when its chain is a prefix of the offered chain,
most specific wins — so the image family binds through one input
(`in_image_write`) instead of per-subtype ports, and a png-specific input
correctly rejects a gif. Explicit ?input/#output selection matches the name
token exactly (legacy substring kept as bridge); unnamed legacy ports read as
name "default". The image subtypes dropped their duplicated octetstream output;
file: gained the family write input (in_image_write); httpConnection replies
derive the mime from the arriving typed input; Console/mime accept typed images
through their family inputs. A universal-byte-sink rule was tried and REVERTED:
it mis-bound plain value emits into [octetstream] inputs and killed repeat
flows (times/multi_output). Suite 160/0.

## What changed 2026-10-22 (Phase 3 cutover)

**The Dawn server is the default.** `npm run dawn` now runs
`node dawn.js server/main.dawn` (port 3000). The JS reference stack —
`dawn_console.js`, `dawn_run.js`, `hubserver.js`, `checkForLocalHost.js` —
is retired to `Dump/` (dawn_console stays runnable there as the parity
harness's reference). `dawn.js` is the single Node entry point (runs any
`.dawn` program; the server is just its first client). editor_tabs drives the
real Dawn server now.

**First real concurrency fix.** A browser page loads its assets in parallel,
and the guard-list's `var:httpConnection:connection` capture is shared program
state: an overlapping request's connection overwrote the capture, so replies
crossed wires (one request's body landed on another's response; the loser
timed out to 204). `httpConnection` now carries a completion signal
(`resource.done`, resolved on every answered site) and `httpServer.handle`
awaits it — one request's flow at a time, hard-capped at 10 s so a wedged
handler cannot stall the server. This was the roadmap's named risk
("first genuinely concurrent resource") materializing, exactly as forecast.

## What changed 2026-10-16 (server replacement, W5+W6)

**All routes localhost-gated via the guard-list** (env, /file:/// read, static
public, PUT — one if sentence gates the list; non-local requests fall
through to 204; a login mechanism may replace the guard-if later). The
List gained universal self-type ports (in_List_/out_List — rule 3:
implicit for value resources).

**The Dawn server fully replaces dawn_console.js HTTP surface — strict byte parity.**
ode dawn_run.js server/main.dawn serves the IDE routes: environment.json,
static public (byte-exact), /file:/// read+listing, PUT /_file (with the
build_sources trigger), CSP headers, catch-all 204. Parity matrix 20/20 with
STRICT_PARITY=true; suite 160/0. New: httpConnection.fileserver/filewriter,
host-guard if sentences (match+Boolean.if, go_then replay + lifecycle
pass-through in the var reference), Dawn.cast moved onto the runtime.

## What changed 2026-09-22 (blob→octetstream + editor/flavor pipeline)

**Blob is gone; binary = `application/octetstream`.** The old universal
`Content-Type/data/Blob` resource was deleted and replaced by a resource named
`octetstream` living at `dawn/Content-Type/application/octetstream.dawn` —
the true `application/octet-stream` fallback in `Dawn.cast`. The binary
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
