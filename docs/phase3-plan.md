# Phase 3 plan — The server, in Dawn

Scope: `node dawn_run.js server/main.dawn` serving the current IDE (editor +
console). Pure-`Dawn` language support FIRST; basic-flavor sugar LAST (user
directive: the server work itself decides what language support must exist).

## Settled design (2026-09-22)

- **`dawn/Scheme/httpServer.dawn`** — low-level listener resource, the
  Express-minimal primitive; an `express:`-style scheme may be layered later.
  - `httpServer:port` listens; per request it fires **out_request_headers**
    first, then **out_request_\<Type\>** per the cast content-type of the
    request body (`out_request_octetstream` fallback). Binder rules untouched.
  - Response flows back through **in_String / in_octetstream** (body) plus
    header/status inputs.
- Server programs live in **`server/`** (exit criterion:
  `node dawn_run.js server/main.dawn`).
- Console page (`public/dawn_console.html`, the old `index.html`) uses no
  sockets — **hubserver/socket:
  deferred** until something actually needs it.

## Work items

| # | Item | Lands |
|---|------|-------|
| W1 | **Parity harness** `Test/integration/server_parity.test.js` — boots JS and Dawn servers on ephemeral ports, diffs a route matrix (status/headers/body). Dawn side SKIPs until `server/` exists; suite stays green throughout. | ✅ done 2026-09-25 |
| W2 | `dawn/Scheme/httpServer.dawn` — listener on `node:http`; Request resource (`method/url/headers/body`), Response inputs; per-request processor clone (late-connect, same pattern as Dawn.cast). | ✅ done 2026-09-25 (see caveats below) |
| W3 | `mime:` resource (`dawn/Scheme/mime.dawn`) — extension lookup through the underlying mime table; magic-byte sniffing when bytes are fed through the octetstream port; unmatched extensions fall back to `binary/<ext>`. | ✅ done 2026-09-25 |
| W4 | runtime support in pure Dawn: `argv:N` (process args), `exit:`/`exit:N`, the `dawn:` meta resource finished under `dawn/Scheme/dawn.dawn` (compile+execute source, prints forwarded as `out_String`, failures → `out_error`), `exec:` (child process, localhost-scoped). Plus `dawn_run.js` accepts trailing args so `argv:` has something to read. | ✅ done 2026-09-25 |
| W5 | IDE routes in Dawn, one at a time, each verified by W1: GET /environment.json, GET /file:///… (dir listing + file mime), PUT /_file (localhost-guarded, triggers build_sources via exec:), static mounts public BNFT dawn uil, CSP header middleware, catch-all 204. | ✅ done 2026-10-16 (rev 2 — file ops absorbed into file:): the fileserver/filewriter sub-resources were dissolved — the fs semantics (reference listing, reference mime, the {} case, writes + the build_sources trigger) live on **file:s explicit operation ports** (in_String_read/in_Data_write/out_Data/out_octetstream/out_Boolean_success; errors on out_error with optional HTTP status), reached through two thin hops (httpConnection.path: for GET /file:///, httpConnection.upload: for PUT /_file — the hops carry the http-shaped bits: the /file:/// prefix gate, the host 403, the ?path= parse). The PUT chain selects the write acknowledgement via a **named output** (file:#success — out_Boolean_success; the http layer translates the Boolean into 200 "OK", so the file resource stays protocol-agnostic — a likely standard pattern for success signals). The connection gained **in_error** (strings reply text/plain, objects reply application/json — the reference file-route error behavior). main.dawn uses the **guard-list** (2026-10-16, restored — it is the intended shape): ONE localhost-if gates a LIST containing ALL connection flows (env, /file:/// read, static public, PUT — everything localhost-gated now, 2026-10-16; a login mechanism may replace the guard-if later). The static mount serves through httpConnection.path:public (the base-mode path adapter: base+path join, / → index.html, traversal → 403, missing → silent 204 fall-through) into file:s in_String_read. The list machinery: go/go_then starts the list (in_go on a COPY), go_else absorbed, element lifecycle unwired in List.connect, Flow lifecycle heads null-guarded. test.jpg removed from main.dawn (it was the scheme-routing prop). All routes parity-verified, STRICT parity on: env (host-guarded if sentence), static public (via-subscription), /file:///… (httpConnection.fileserver — reference read_dir verbatim, {} special case, 404 error-json bodies), PUT /_file (httpConnection.filewriter — body from the connection .body bytes, 403/400/200/500, build_sources trigger), CSP headers on every reply, catch-all 204. Multi-route dispatch = the var qualified-reference broadcast (if sentences: match+Boolean.if, go_then replay, lifecycle pass-through). Test-csp dropped from both servers; cors was already commented out in the reference. |
| W6 | Cutover: parity diff empty; suite green; docs/library.md rows; ROADMAP checkboxes flipped. | ✅ done 2026-10-16 — parity matrix 20/20 with STRICT_PARITY=true; suite 160/0; dawn_console.js stays as the parity harness reference (and editor_tabs dependency) until the default-port flip; the Dawn serving path has zero Express references. |

## Cutover (2026-10-22)

- `dawn.js` (repo root) is the single Node entry point — runs any `.dawn`
  program; `npm run dawn` → `node dawn.js server/main.dawn` (port 3000).
- Retired to `Dump/`: `dawn_console.js` (paths patched so it still runs there
  as the parity harness's JS reference), `dawn_run.js`, `hubserver.js`,
  `checkForLocalHost.js`.
- `hubserver.js` was **dropped, not ported**: it is started by dawn_console.js
  but no page has connected to it since the old `index_old.html` days
  (`hubclient.js` has zero references in any current HTML/JS/test). Its
  remote-eval role is superseded by the planned `server:`/`browser:`
  cross-boundary call schemes (see ROADMAP Phase 4).
- editor_tabs drives the real Dawn server now (fixed port 3000; the test
  frees the port first — that includes a running dev server).
- **Concurrency fix** (the named risk materialized): a browser page fetches
  assets in parallel, and the guard-list's `var:httpConnection:connection`
  capture is shared program state — overlapping requests overwrote the
  capture, crossing reply bodies and stranding requests on the 204 default.
  `httpConnection` now exposes a completion promise (resolved on every
  answered site) and `httpServer.handle` awaits it, hard-capped at 10 s:
  one request's flow runs at a time. Verified with parallel-fetch probes;
  suite 168/0.

## W2 findings (land the learnings)

- **Programs cannot yet wire locally-defined resources.** `NewResource:hello`
  creates a resource in the enclosing scope, but `hello:` on a following
  program line never lands in the lookup tree — the connection never happens
  and nothing throws. This is the Phase 2 "define" gap, exactly as forecast;
  until it lands, handler resources must live in the dawn tree (W2's
  `httpHello` does).
- **Canonical programs containing `Meta.` lines compile but don't run** —
  the compiler is fine; there is simply no `Meta` resource bound, so the
  flow never executes (user correction 2026-10-01). A pass-through `Meta`
  resource would fix it but is DEFERRED (user decision). `server/main.dawn`
  stays doc-free for now.
- The shipped shape: `httpServer:port` is an acceptor emitting one
  **`httpConnection`** value per request (meta on `.value`; the reply wire is
  inside it — the connection itself writes the wire through `in_response_$all`,
  and answers itself 204/404 when still silent at `out_end`), with a
  per-request lifecycle
  `out_begin → out_httpConnection → out_request_headers → out_request_<Type>`
  (body cast, octetstream fallback) `→ out_end`. **No return values — flows
  stream**; accumulating resources like `json:` seal and emit at `in_end`.
  The canonical handler form (2026-10-08, route-gated since 2026-10-15) is a
  **list body** closed by a reference:
  `httpServer:0#|httpConnection>>[var:httpConnection:con>>httpConnection.route:…>>json:>>con:]`.
  `var:Type:name` looks the type up, instantiates a named object into the
  enclosing scope (script context), and captures the per-request value as it
  flows by; `con:` is then a pure reference that routes each call into the
  captured instance. The redirect through `#|httpConnection` is only needed
  when the default-output heuristic picks wrong; once output binding derives
  from the list's first element, plain `httpServer:>>[…]` suffices. (User
  corrections: JS returns are promise plumbing only — 2026-10-02;
  acceptor/connection split — 2026-10-02; connection owns the wire —
  2026-10-08; the JS "pending queue" plus server-side `in_response_$all`
  relay are GONE. **Correction 2026-10-16 (final shape)**: the connection
  is a resource holding the `req`/`res` pair from handle (its own edge)
  plus the meta on `.value`; `in_go` presents the request to the pipe
  (emits the meta on `out_request_headers`), `in_response_$all` replies to
  `res`, and `in_end` — the end event reaching it through the flow —
  answers the default after a grace window (acceptor-side 100ms). The
  acceptor creates + emits it and answers itself only when no connection
  is bound (204 when other request ports fired, 404 when nothing routed).

## W3+W4 findings

- **Flow steps start on receipt, not on `in_go`.** Only the chain head's
  `in_go` fires; later elements are reached through port calls. Compute-heavy
  newcomers (`dawn:`, `exec:`) must *begin their work inside `in_String` /
  `in_octetstream_$all`* — `run()` is called from the port, `in_go` only
  covers the URI-parameter case. The flow executor also requires
  Dawn-wrapped promises (`result.promise()`); a native `async in_go`
  crashes it — don't `return` long-running promise chains.
- **The `dawn:` meta originally sat under `Content-Type/application/`** —
  unresolvable: the lookup hit the `dawn` *directory* node
  (`text/directory-json`) before ever seeing it. Schemes belong under
  `dawn/Scheme/`; that's where they match the URI prefix. The stub and its
  stale generated artifact are gone.
- **Dawn program resources need `const Resource = Dawn.require("Content-Type/data/Resource")`** —
  native payloads; skipping it = runtime `Resource is not defined` on first
  construction. Same trap for `StringRes` etc.
- **Doc-build gates are strict in both directions**: undocumented ports fail
  the build AND extra ports do (`this.in_String = this.in_String_$all` alias
  style = an undocumented extra port). Don't alias public ports; $all and
  plain forms collapse for binding purposes anyway.

## Deferred

- `socket:` / hubserver — nothing in the IDE uses it.
- Basic-flavor readability wrappers.
- Phase 2 leftovers (mixed chains, TD comparisons) — orthogonal.
- **Flavored server syntax** (user decree 2026-10-08): `.dawn` files are
  *always* stored in pure canonical Dawn; flavors exist only as an editor
  view/edit surface. The readable flavored form of the canonical handler
  (`httpServer:0#|httpConnection>>[var:httpConnection:con>>httpConnection.route:...>>con:]`)
  is deferred with target sketch:

      httpServer: >>
          var con : httpConnection
          httpConnection.route:environment.json >> scheme.paths >> json: >> con:

  Should also allow starting with `httpServer:#|httpConnection>>` when the
  handler omits the `var`, and should support `.dawn` (pure canonical) and
  `.dawn_basic` (flavored) files side by side; the server reads both.
- **Host guard** (user decision 2026-10-15): `httpConnection.route:` carries
  no host logic. A dedicated element (a `hostRoute`-style gate or an
  if/else whose else answers non-local requests) goes upstream of the route
  dispatch — multiple routes will share the same host mask, and the
  not-localhost branch needs an answer too. Must land before `PUT /_file`
  (localhost-guarded in the JS server); until then `/environment.json`
  answers non-local clients too (parity matrix is local-only, so unaffected).

## Exit criteria

- `node dawn_run.js server/main.dawn` serves the working IDE (editor + console).
- Parity matrix diff-empty between the JS server and the Dawn server.
- `node Test/runner.js` fully green including the new suite.

## Risks

- Per-request processor cloning (`instanciate_processor` + late-connect) — the
  first genuinely concurrent resource family in Dawn (roadmap named risk).
- out_request_headers must fire before the typed body port on every request.
- `exec:` (W4) must stay localhost-scoped; never reachable remotely.
