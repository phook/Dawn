# Port & URI conventions in the JS compiler stack

The conventions the JS compiler (`DawnCompiler` + BNFT grammars) and the
runtime (`public/dawn.js`, `dawn/Content-Type/data/Resource.dawn.js`) assume
about URIs and port names. For the documentation format built on top of
these conventions see `documentation-standard.md`.

## URI resolution

A Dawn URI is `Scheme:identifier`. The scheme may be dotted — dots are path
segments in the resource tree under `dawn/`:

| URI | file |
|---|---|
| `String:` | `dawn/Content-Type/data/String.dawn(.js)` |
| `String.concatenate:` | `dawn/Content-Type/data/String/concatenate.dawn(.js)` |
| `Resource.NewInput:` | `dawn/Content-Type/data/Resource/NewInput.dawn(.js)` |
| `Scheme/file:` (in-resource require) | `dawn/Scheme/file.dawn.js` |

`initialize` seeds the search path prefixes tried for every short (dotless)
scheme — see `public/dawn.js` (`this.children["dawn"].path.push(...)`):
`Scheme.`, `Content-Type.data.`, `Content-Type.data.Resource.`,
`Content-Type.application.`, `Content-Type.image.`. That is why
`NewInput:String:inp1` resolves to the same resource as the explicit
`Resource.NewInput:String:inp1`. Add a path entry when a resource folder
should own short URIs; drop it to force fully-qualified use.

`.dawn` sources are compiled to `.dawn.js` artifacts by `build_sources.js`
(hidden files, stamped with the source's mtime — stale = mtime differs).
The runtime loads the artifact, never the source.

## Port-name grammar

```
  in|out_<type...>_<name>_<marker?>
  │    │          │       └─ markers: _$all, _$explicit, _$group_<n>
  │    │          └───────── name — mandatory; "default" is the reserved
  │    │                      anonymous name
  │    └──────────────────── type chain, general → specific
  └───────────────────────── direction
```

- A plain value type is one chain token (`in_String_write` → chain
  `[String]`); an image subtype is `out_image_gif_default` → chain
  `[image, gif]`.
- **Matching is type-only, by the subtype rule**: an input connects when its
  chain is a *prefix* of the offered chain — `in_image_write` accepts any
  image subtype; `in_image_png_write` rejects a gif. When several inputs
  match, the longest (most specific) chain wins.
- Names exist for explicit `?input=`/`#output=` selection and are matched
  exactly as the name token.
- Markers stay as suffixes after the name. `_$all` keeps an input
  multi-bindable (it is not removed from the offer after a connection);
  `_$explicit` keeps a port out of the automatic input list; `_$group_<n>`
  is stored on the port definition (no semantics yet — see ROADMAP
  pin-socket item).
- Lifecycle ports (`in_begin`, `in_end`, `in_error`, `in_go`) are exempt
  from the grammar and stay multi-bindable.
- A **typed default** port `in_<Type>_default[_$all]` is the anonymous
  read/write channel of a value of `<Type>` (e.g. `String:`'s
  `in_String_default_$all`).

## Run-time resource construction

`Resource.NewResource:` builds a resource while the program runs. The
declaration is the var-flavor list form — port definitions flow into the
NewResource element:

```
[[ [ [String:Hello]>>String.concatenate:>>NewInput:String:inp1 ] ]]>>NewResource:Tester
Tester:>>Console:
```

Mechanics (implementations in `dawn/Content-Type/data/Resource/`):

- `Resource.NewInput:<Type>:<name>` declares one input port;
  `Resource.NewOutput:...` one output port. The tail carries only the
  type chain and name (`Type:name`), split inline in `in_instanciate`. An
  empty type is a chainless port. The declared name stays clean; the
  runtime port key still carries the `_$`-markers (`in_String_name_$all`),
  so the marker mangling happens inside the port resource.
- Port flags ride as **Dawn inputs** — NEVER as tail parameters, and
  `in_instanciate` parses nothing but the tail's `Type:name`. Two
  assignment forms, both delivered by the runtime into the port's input
  functions:
  - URI parameter assign (the leading `|` marks an assigned input):
    `NewInput:String:name?|all=true&|explicit=true&|group=g&|name=n` — the
    runtime resolves each value to a Boolean/String/Number resource and
    fires the matching input function at the declaring flow's end.
  - Wired value with input selection: `[Boolean:true]>>NewInput:String:name?all`
    — `?all` selects the input whose port NAME is `all`, the list binds
    into it, and the flag fires when the declarer chain runs.
  The input functions are `in_Boolean_all_$explicit`,
  `in_Boolean_explicit_$explicit`, `in_String_group_$explicit`/
  `in_Number_group_$explicit`, `in_String_name_$explicit` — carried as
  `_$explicit` variants so the automatic input list (built from
  non-`_$explicit` keys) can never match them against the capture slot's
  chain. A flag arriving after registration rewrites the registered port
  key (`refreshPortRegistration`).
- When a port element connects to the constructed resource it registers
  there: `registerInputPort` / `registerOutputPort` add a typed port
  `in_<Type>_<name>` / `out_<Type>_<name>` (deduped by name) and seed the
  port's forward reference (`seedRef`) at the constructed instance.
- Typed ports also install a **typed capture slot**
  `in_<Type>_default_$all` on the port processor — this is what the
  declarer-time chain binds to (the port-name grammar names typed default
  ports `in_<Type>_default`, so a chainless `in_default_$all` would never
  match a typed offer).
- Values arriving at a port are captured on the port resource and forwarded
  through the constructed resource's matching out channel
  (`out_<Type>_default`); chainless ports forward through whichever
  non-lifecycle out channel is currently wired.
- `<Name>:` dereferences to a per-use processor clone sharing the resource
  (reference semantics, like `var:`). The constructing instance is cached as
  the resource's `default_processor_instance` so the registrations survive
  the lookup.
- On `in_go` the constructed resource replays retained declarer-time
  captures downstream (typed ports, once each).
- Known emission overlap: a capture can emit once when its channel is
  already wired and again on replay (ROADMAP dedup item).

## Defining resources in source

Resources are defined in `.dawn` sources as one canonical flow line —
`[Native.Javascript:<urlencoded js>]>>NewResource:<URI>` — preceded by
`Meta.documentation:` lines (subject line = the resource's real URI as
derived from the file location). `build_sources.js` extracts the native
block into the `.dawn.js` artifact; `build_docs.js` cross-checks the
documentation (`@kind` must be `value` or `operator`, `@port` lines must
match statically assigned `this.in_*`/`this.out_*` ports; dynamically
created ports — `this["in_" + ...]` — are exempt from static cross-check).
