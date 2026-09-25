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
| W2 | `dawn/Scheme/httpServer.dawn` — listener on `node:http`; Request resource (`method/url/headers/body`), Response inputs; per-request processor clone (late-connect, same pattern as Scheme/cast). | |
| W3 | `mime:` resource — extension→content-type lookup for file serving. | |
| W4 | runtime support in pure Dawn: `argv:` (process args), `exit:`, the `dawn:` meta resource finished (compile+execute source — currently an empty stub), `exec:` (child process; needed for the save→build_sources trigger). | |
| W5 | IDE routes in Dawn, one at a time, each verified by W1: `GET /environment.json`, `GET /file:///…` (dir listing + file mime), `PUT /_file` (localhost-guarded, triggers build_sources via `exec:`), static mounts `public BNFT dawn uil`, CSP header middleware, catch-all 204. | |
| W6 | Cutover: parity diff empty; suite green; docs/library.md rows; ROADMAP checkboxes flipped. | |

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
