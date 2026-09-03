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

- [ ] Rotate + purge the API keys committed in `litellm_config.yaml`
      (keys must be rotated by the owner; the file must leave git history).
- [x] Fix confirmed one-line bugs that poison everything built on top:
  - `dawn/Content-Type/data/Number.dawn.js` — undefined `number` variable in `in_Number`
  - `dawn/Content-Type/data/String/concatenate.dawn.js` — non-optional output call throws when unbound
  - `dawn/Content-Type/data/Number/add.dawn.js` — `bigRat(0, 10)` misreads the (num, denom) signature
  - `checkForLocalHost.js` — checks `err` but the parameter is named `error`
- [x] Restore the localhost guard in `dawn_console.js` file routes
      (the JS server stays the reference implementation through Phase 3).

Exit criteria: existing test suite still passes; no behavior changes.

### Phase 1 — Standard library ("the system")

Goal: a reasonable battery-included library so real programs are writable.

1. Complete the core data resources (`dawn/Content-Type/data/`):
   - Number: comparisons (`less`, `greater`, `equal`), modulo, min/max, floor/ceil/round
   - String: `length`, `indexOf`, `substring`, `split`, `replace`, `upper`/`lower`, `trim`, encode/decode
   - List: `get`, `remove`, `length`, `map`, `filter`, `join` (add/iterate exist)
   - Boolean: verify complete; error propagation polish
2. Control-flow resources: `times:`, `loop:`/`while:`, `clock:`/`interval:`,
   `async:`/`await:`, `Identifier:` (mutable reference — needed by `Meta:Assignment`).
   Sketches exist: `dawn/loop.js`, `dawn/Identifier.js`, `dawn/times.dawn_basic`,
   `dawn/Clock.dawn_basic`, `dawn/async.dawn_basic`.
3. Scheme resources (`dawn/Scheme/`):
   - `file:` — extend beyond read: write, append, list (directory-as-JSON), stat, delete, mkdir
   - `http:`/`https:` client (finish the `dawn/http.dawn_basic` sketch)
   - `http:` server (`http:port` with `out_Request` / `in_Response`) — required by Phase 3
4. Error model standardization: one documented `in_error`/`out_error` convention
   on every resource; the empty "raise error" comments in `Number.dawn.js` become real.
5. `docs/library.md` — coverage matrix: every resource, its ports, its test status.

Exit criteria: every resource has a passing case in `Test/cases/dawn/`;
`docs/library.md` is green; the codeexamples run on the library alone.

### Phase 2 — The basic flavor, finished

Goal: basic flavor is *the* way humans write Dawn; canonical URI form is the assembly.

1. Fix the four known grammar bugs (diagnosed in `docs/progress.md`):
   - `TD_FUNCTION_LINES` accepting bare expressions (all 12 basic→dawn failures)
   - FD body-printer wiring (all 13 dawn→basic failures)
   - `÷` surviving into literals
   - the `subtract` vs `negate`+`add` round-trip mismatch
2. Extend the flavor: comparisons in TD rules (FD side exists), loops (`for`/`while` —
   `Basic.dawn_basic` already sketches the aspiration), function definitions
   (not just resource `define`), override of existing resources, `Meta:Assignment` runtime.
3. Round-trip guarantee: basic → dawn → basic is identity; extend `Test/cases/`.
4. Run `check_grammar.js` clean (kills the contradictory duplicate `FD_IF_*` pairs);
   update `docs/basic-flavor-syntax.md` to match the final grammar exactly.

Exit criteria: 100% round-trip on the full corpus; any Phase-1 library feature
writable in basic flavor without touching URI form.

### Phase 3 — The server, in Dawn

Goal: `dawn_console.js`, `hubserver.js`, `dawn_run.js` reimplemented as `.dawn`
sources, readable in basic flavor via `define` blocks, `native javascript` only
at genuine edges (socket syscalls).

Order:

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
