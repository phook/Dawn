# Dawn Master Roadmap

Long-range plan for completing Dawn. Sequenced so that every phase ends with a
working system, the language increasingly eats its own dogfood, and tests grow
with each phase.

## Guiding principles

1. Read the dependency chain, not the wish list.
2. Every phase ends with a working system — never leave the repo broken.
3. Write it in Dawn as early as possible, so pain surfaces early.
4. Tests grow with each phase — extend `Test/runner.js`, never bypass it.

## Phases

### Phase 0 — Foundations (small, do first)

Not refactoring — just unblocking everything after it:

- [x] Remove `litellm_config.yaml` (no longer using LiteLLM — file deleted;
      note: old keys remain in git history, deactivate them at the provider if
      not already done).
- [x] Fix confirmed one-line bugs that poison everything built on top:
  - `dawn/Content-Type/data/Number.dawn.js` — undefined `number` variable in `in_Number`
  - `dawn/Content-Type/data/String/concatenate.dawn.js` — non-optional output call throws when unbound
  - `dawn/Content-Type/data/Number/add.dawn.js` — `bigRat(0, 10)` misreads the (num, denom) signature
  - `checkForLocalHost.js` — checks `err` but the parameter is named `error`
- [x] Restore the localhost guard in `dawn_console.js` file routes
      (the JS server stays the reference implementation through Phase 3).

Exit criteria: existing test suite still passes; no behavior changes.

### Phase 1.5 — Documentation system — ✅ DONE (intermediate phase)

Documentation is a resource: `Meta.documentation:` sidecars next to every
`.dawn.js` implementation (docs only ever live in `.dawn` files, never in the
future precompiled `.js`). Delivered:

- `docs/documentation-standard.md` — the form (one-line summary, `@port`,
  `@example`, `@see`, `@status`) and the project standard (one top resource,
  pages link downward through the hierarchy)
- `build_docs.js` — extractor: introspects ports from source, cross-checks
  them against documented ports (mismatch = build failure), emits one HTML
  page per resource + tree index into `docs/api/` (gitignored, regenerated)
- Sidecar docs for all 40 resources in the library
- `Test/runner.js` executes every `@example` — **docs are tests** (48 doc
  examples currently green)

Future: extractor becomes a Dawn flow (Note 7's pipeline); docs become
runtime-queryable resources (IDE hover, Phase 7 LLM corpus); HTML output
replaced by UIL pages.

### Phase 1.75 — Sources live in `.dawn` — ✅ DONE (intermediate)

Every library resource's source is now its `.dawn` file: `Meta.documentation:`
lines plus a `define <URI>` block with `native javascript {...} endnative`
(verbatim JS inside — real native lowering arrives with Phase 2).
`build_sources.js` generates `.dawn.js` only when the source is newer
(staleness = mtime mismatch; artifacts carry source timestamps and the Windows
hidden attribute). The doc extractor and runner ignore implementation lines.
52 .dawn.js artifacts are generated, never hand-written.

Future: `.dawn.js` becomes the timestamp-checked precompile of a true `.dawn`
grammar resource (when Phase 2's `define` semantics land); editor edits the
.dawn with embedded JS directly.

### Phase 1 — Standard library ("the system") — ✅ DONE

Goal: a reasonable battery-included library so real programs are writable.

1. Complete the core data resources (`dawn/Content-Type/data/`):
   - [x] Number: comparisons (`less`, `greater`, `equal` — chained semantics), modulo, min/max, floor/ceil/round
   - [x] String: `length`, `upper`/`lower`/`trim`, `split`, `substring`, `replace`, `indexOf`
     (parameter convention established: `?|name=value` drop-in inputs — see library.md)
   - [x] List: `length`, `join` (stream semantics over mixed String/Number/Boolean)
   - [x] List: `get` (index as named port or parameter; element re-emitted with its own type)
   - [x] List: `get`, `remove` (index-named port or `?|index=n`), `map`, `filter`
     (`Reference:` resource added — `Reference:Number.negate` passes resources as values;
     map/filter take it via `?|using=` param or flowing `Reference:`)
   - [ ] Boolean: verify complete; error propagation polish
2. Control-flow resources:
   - [x] `times:` (already existed as `Number.times:` — enhanced with `out_Number` index)
   - [ ] `Identifier:` — DEFERRED to Phase 2 (needs scope/assignment per Note 7 VARS)
   - [ ] `loop:`/`while:` — DEFERRED (user decision): needs break semantics
   - [ ] `clock:`/`interval:` — DEFERRED (user decision)
3. Scheme resources (`dawn/Scheme/`):
   - [x] `file:` data writing: `file:<path>?write` / `?append` — the receiving input
     picks the operation (mutually exclusive); loader role intact (diversion gated
     on the `?write`/`?append` selection only)
   - [x] `file:` data read: `file:<path>?read` — casts by content-type, late-connects
   - [x] content-type casting: `dawn/Dawn.cast.dawn.js` — text/*→String, json→Data,
     `application/octet-stream`→`octetstream` resource (the universal binary
     fallback, `Content-Type/application/octetstream`), `image/*`→image family
     resource bridging to octetstream bytes. Values late-connect to the flow with
     their true type.
   - [x] `http:`/`https:` client (late-cast on content-type; error channel on failure;
     integration test: Test/integration/http_client.test.js)
   - [ ] `http:` server (`http:port` with `out_Request` / `in_Response`) —
     **MOVED TO PHASE 3**: needs content-types it can serve to be meaningful
     (user decision 2026-09-03).
4. Error model: DONE (first pass) — errors are values on the `out_error` channel,
   never thrown; `Console:` prints the error channel; invalid `Number:` literals
   emit real errors (convention codified in docs/library.md).
5. `docs/library.md` — coverage matrix: every resource, its ports, its test status. (started)

Design concept noted for a later phase (NOT to be implemented ad hoc):
**output interfaces / pin groups** (`docs/output-interfaces.md`, from Dawn
Notes/Note 7 + preamp analogy; numeric `_N_` port grouping with binder trial order).

Exit criteria met 2026-09-03: every resource has a passing case in Test/cases/dawn/; docs/library.md is green; the codeexamples all run (HelloWorld rewritten; Tester: removed from it � it returns in Phase 2 when define/Meta:Assignment land).

### Phase 2 — The basic flavor, finished — 🚧 IN PROGRESS

Goal: basic flavor is *the* way humans write Dawn; canonical URI form is the assembly.

Done so far:
- [x] Round-trip corpus stable: 21 basic→dawn + 21 dawn→basic cases pinned by snapshot
- [x] Native blocks in define bodies: indentation, nested braces, `%`-leading and
      empty payloads all survive the round trip
- [x] Comments as metas: `#` → `Meta.Comment:>>`, `#doc` ↔ `Meta.documentation:`
- [x] Editor enforces the flavor end-to-end (load/save/switch all go through
      the grammar); syntax gating blocks switching/saving on errors
- [x] `check_grammar.js` duplicate-free (URI1/URI2 unused-but-defined remain)
- [x] `Meta:` skip machinery removed from the compiler; metas are ignored via
      `dawn/Flavors/removeMeta.bnft` instead
- [x] `Meta:Assignment` clarified — canonical hint for flavors only
      (`Meta:Assignment>>expr>>x` pretty-prints as `x ≔ expr`; no runtime
      semantics needed and none planned)

Still open (see docs/progress.md "Known remaining gaps"):
- [ ] Mixed arithmetic chains (`1 + 2 - 3`)
- [ ] Comparisons in TD syntax (FD side exists)
- [ ] Loops (`for`/`while`) and function-definition statements beyond
      resource `define`; resource override statements
- [ ] Regenerate `docs/basic-flavor-syntax.md` to match the final grammar

Non-goals recorded 2026-09-22: bare expressions in bodies are rejected *by
design* (Dawn has no return values — everything must flow to an output), so
that item is off the list, not deferred.

Exit criteria (unchanged): 100% round-trip on the full corpus; any Phase-1
library feature writable in basic flavor without touching URI form.

### Phase 3 — The server, in Dawn — 🚧 IN PROGRESS (see `docs/phase3-plan.md`)

Goal: `dawn_console.js`, `hubserver.js`, `dawn_run.js` reimplemented as `.dawn`
sources, readable in basic flavor via `define` blocks, `native javascript` only
at genuine edges (socket syscalls).

Order:

0. **Storage decree (2026-10-08):** `.dawn` files are ALWAYS stored in pure
   canonical Dawn. A flavor is only seen when an editor lets a human view or
   edit the file — never in the stored artifact. The flavored server handler
   form (`httpServer: >>` + var/if block) is deferred with a target sketch;
   see `docs/phase3-plan.md` "Deferred".
1. `dawn_run.js` first (smallest; proves self-hosting — the meta resource
   `dawn.dawn.js` already runs Dawn-in-Dawn).
2. `dawn_console.js` routes one at a time with the JS server live as reference:
   `/file:///` read + directory-JSON, `PUT /_file`, static mounts, `/environment.json`.
   Needs the Phase 1 `http:` server scheme and a `mime:` resource.
3. `hubserver.js` (needs a `socket:`/websocket scheme).
4. Basic-flavor "meta" wrappers so the server reads like prose.

Bootstrap strategy: run both servers side-by-side on different ports; an
acceptance script hammers both and diffs responses. Flip the default only at
parity; retire the JS versions to `Dump/`.

Exit criteria: `node dawn_run.js server/main.dawn` serves the current web IDE
with byte-identical behavior; zero Express references in the serving path.

### Phase 4 — UIL × Dawn integration

Goal: UIL stops being layout-only and becomes the UI layer *of* Dawn.

Key design decision (prototype first): **component-as-resource** — every UIL
component is a Dawn resource with `in_*`/`out_*` ports (button: `out_go` on
click, `in_String` sets label). A UIL page becomes a Dawn flow whose nodes
happen to render — preserving "everything is a resource".

1. Bridge model + two-way binding prototype (prove on `public/banana_melee/`).
2. Component library in UIL templates replacing `public/templates/`:
   button, text-field, list, tabs, framed, app-bar-top, project-inspector.
3. The two big wrapper components: ACE editor (absorbing the `≔` monkey-patches
   from `editor.html`) and terminal/prompt (wrapping the `index.html`
   `TODAWN_COMMANDPROMT` loop).
4. `{script flavor=basic}` blocks executing through `Dawn.execute`.
5. Browser-side component test harness.

Exit criteria: banana_melee rewritten as UIL+Dawn flows (no hand-wired JS events);
components individually testable.

### Phase 5 — All web pages as UIL + Dawn

1. `index.html` (terminal/prompt) → UIL page via the Phase 4 terminal component.
2. `editor.html` → UIL page via the editor component.
3. Retire `dawn_ide.html` and the `- Copy.uil` duplicates — one canonical IDE page.
4. The Phase 3 Dawn server compiles+serves these UIL pages.

Exit criteria: zero hand-written HTML in `public/` — everything is `.uil`+`.dawn`
compiled at serve-time. The IDE edits Dawn source, served by a Dawn server,
rendered by Dawn-driven UI. Full circle.

### Phase 6 — The book

Goal: the tutorial becomes the front door; every joke lands on a runnable example.

1. Examples first (testable, prose isn't): one runnable `public/codeexamples/`
   program per library feature, each wired into `Test/runner.js`. This corpus is
   also the seed for Phase 7 fine-tuning — write it well.
2. Chapters past 3: URI model → data types → flows → define → flavors → building
   the IDE itself → banana melee capstone ("finish book with banana melee",
   `Dawn Notes/Note 2.txt`). Keep the de-poignantized voice: light `_why` flavor,
   one joke per concept, never jokes replacing explanation.
3. Existing joke assets have homes: Heraclitus "A Flow Blow" (ch. 1/2),
   the Beck `Number:5>>times:>>String:Odelay` program (flows chapter — it's
   already a valid program).
4. Quizzes with answers + interactive versions via the Phase 5 `?input=`
   RUN-button mechanism.

Exit criteria: every code sample in the book is executed by the test suite;
a reader can complete the tutorial using only pages Dawn itself serves.

### Phase 7 — Linux bundle + LLM harness (deferred)

Two properties make this unusually feasible: the runtime is pure Node (only
`.bat` files and README are Windows-bound) and **the language can generate its
own training corpus** — synthesize valid Dawn/UIL programs from the grammar,
filtered by the compiler as oracle, seeded by the Phase 6 corpus.

1. Linux build: shell equivalents of `*.bat`; package as AppImage/deb or
   single-executable (`node --experimental-sea`/`pkg`). "Full-fledged UI" =
   Phase 5 IDE in a kiosk/webview shell with host `file:` access.
2. Corpus generation from grammar + compiler oracle + book examples.
3. Fine-tune a small code model (7B-class, llama.cpp/ollama-servable).
4. Chat harness (the opencode/claude-code analog): a Dawn program looping
   chat → generated basic-flavor → compile-check → sandboxed run → result.
   The Phase 5 IDE *is* the harness UI.

## Sequencing

```
Phase 0 (keys + bugs)
   └─→ Phase 1 (library) ──┐
        Phase 2 (flavor) ──┴─→ Phase 3 (server in Dawn)
                                  └─→ Phase 4 (UIL×Dawn)
                                        └─→ Phase 5 (pages)
                                              └─→ Phase 6 (book)
                                                    └─→ Phase 7 (Linux + LLM)
```

Phases 1↔2 overlap (write library code in basic flavor as the flavor stabilizes).
Phase 6 examples accumulate from Phase 1 onward.

## Named risks

- **The compiler** — a hand-written string-concatenation parser; Phases 1–3 will
  stress it. Budget for hardening (not rewriting) when pain appears.
- **`http:` server + socket schemes** (Phase 3) are the first genuinely
  concurrent resources — the processor model faces its real test there.
- **Flavor scope creep** (loops + functions + overrides + Meta:Assignment) —
  hold Phase 2 exit criteria firm; defer niceties to "flavor 1.1".
