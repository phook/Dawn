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
- Console page (`public/index.html`) uses no sockets — **hubserver/socket:
  deferred** until something actually needs it.

## Work items

| # | Item | Lands |
|---|------|-------|
| W1 | **Parity harness** `Test/integration/server_parity.test.js` — boots JS and Dawn servers on ephemeral ports, diffs a route matrix (status/headers/body). Dawn side SKIPs until `server/` exists; suite stays green throughout. | ✅ done 2026-09-25 |
| W2 | `dawn/Scheme/httpServer.dawn` — listener on `node:http`; Request resource (`method/url/headers/body`), Response inputs; per-request processor clone (late-connect, same pattern as Scheme/cast). | ✅ done 2026-09-25 (see caveats below) |
| W3 | `mime:` resource (`dawn/Scheme/mime.dawn`) — extension lookup through the underlying mime table; magic-byte sniffing when bytes are fed through the octetstream port; unmatched extensions fall back to `binary/<ext>`. | ✅ done 2026-09-25 |
| W4 | runtime support in pure Dawn: `argv:N` (process args), `exit:`/`exit:N`, the `dawn:` meta resource finished under `dawn/Scheme/dawn.dawn` (compile+execute source, prints forwarded as `out_String`, failures → `out_error`), `exec:` (child process, localhost-scoped). Plus `dawn_run.js` accepts trailing args so `argv:` has something to read. | ✅ done 2026-09-25 |
| W5 | IDE routes in Dawn, one at a time, each verified by W1: `GET /environment.json`, `GET /file:///…` (dir listing + file mime), `PUT /_file` (localhost-guarded, triggers build_sources via `exec:`), static mounts `public BNFT dawn uil`, CSP header middleware, catch-all 204. | |
| W6 | Cutover: parity diff empty; suite green; docs/library.md rows; ROADMAP checkboxes flipped. | |

## W2 findings (land the learnings)

- **Programs cannot yet wire locally-defined resources.** `NewResource:hello`
  creates a resource in the enclosing scope, but `hello:` on a following
  program line never lands in the lookup tree — the connection never happens
  and nothing throws. This is the Phase 2 "define" gap, exactly as forecast;
  until it lands, handler resources must live in the dawn tree (W2's
  `httpHello` does).
- **`DawnCompiler.parse` cannot read canonical files with documentation** —
  `Meta.documentation:` lines make compile ERROR, and `dawn_run.js` then
  exits silently. `server/main.dawn` stays doc-free for now; W4's finished
  `dawn:` meta will fix this properly (it knows where the metas belong).
- The shipped shape: `httpServer:port` fires `out_request_headers` first,
  then `out_request_<Type>` (cast of the request body, octetstream fallback);
  the handler chain's return value becomes the response cast back through the
  tree; no bound ports → 404; 204 on empty replies.

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

## Exit criteria

- `node dawn_run.js server/main.dawn` serves the working IDE (editor + console).
- Parity matrix diff-empty between the JS server and the Dawn server.
- `node Test/runner.js` fully green including the new suite.

## Risks

- Per-request processor cloning (`instanciate_processor` + late-connect) — the
  first genuinely concurrent resource family in Dawn (roadmap named risk).
- out_request_headers must fire before the typed body port on every request.
- `exec:` (W4) must stay localhost-scoped; never reachable remotely.
