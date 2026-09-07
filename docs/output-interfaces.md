# Output Interfaces ("pins and plugs") — design concept, NOT yet implemented

> Source: `Dawn Notes/Note 7.txt` (the BINDER and IMAGE INTERFACE sections).
> Status: **concept only — do not build ad-hoc versions of this into resources.**

## The idea

A resource should be able to offer the same data through **several alternative
output interfaces** — like a preamplifier that has an optical output, an RCA
output and a phono output. Each interface is a *plug*; each plug has one or
more *pins*, and a pin is an output.

- The binder connects **at most one plug** from each interface — the first
  (by declaration order) whose *pins match the far side*.
- A single pin carries one output (`out_String`-style).
- A multi-pin plug carries a *streaming convention* — e.g. an image can stream
  as `begin(x,y)` → `pixel(rgba)`×N → `end` (3 pins, one plug).

Port names encode it with a **numeric group marker** `_N_`:

```
_image(self)            plug 0 — whole object, single pin
_domelement_image_1     plug 1 — single pin
_blob_image_2           plug 2 — single pin
_image_begin_3(x,y)     ┐
_image_pixel_3(rgba)    ├ plug 3 — three pins, one streaming convention
_image_end_3            ┘
```

The number groups the pins of one plug *and* gives the binder its trial order.

## Terminology (from Note 7)

- **concept type** — the interface, e.g. `image`
- **value type** — e.g. `rgba`
- **name** — e.g. `pixel` (so `image-pixel` reads: an `image` plug pin of value
  type `rgba` named `pixel`)
- If only one pin of a multi-pin plug is defined (say `image-rgba-pixel`), the
  missing `begin`/`end` pins are implied, or created as pass-through functions.
- Plugs can be **inherited/composed**: `plug 3 { include image-pipe }` adds the
  pins of another resource's plug.

## Why it matters now even though we don't build it yet

It settles an existing ambiguity: **which things are outputs of a resource, and
which are operator resources.**

- A *length* is an **output** (a pin) — eventually `String:Hello#length`,
  not an operator you pipe through.
- `upper`, `lower`, `trim` are **operator resources** — they transform the
  flow itself.

Current interim rule (until interfaces land): length-style values are
implemented as operator resources (`String.length:`), and MUST be migrated to
named outputs/pins when this concept is implemented. Named outputs today
(`out_Type_name`) cannot bind to generic inputs (`in_Type_$all`) — the binder's
`offer_connection` only matches prefixwise, and the `_$explicit`/`$e`
machinery in `Resource.dawn.js` is inconsistent. Fixing the binder *is* the
implementation of this concept.

## Open design questions (from Note 7)

- Interface declaration: where do interfaces/plugs live — on the resource, or
  in a separate `interface` definition block? ("plugs can be put in interface
  definition, so more interfaces can be connected but only 1 plug from each")
- Scoping of definitions — Note 7 sketches `Identifier:`/`Output:`/`Input:`
  passing scope into nested definition levels; unspecified how that maps onto
  the JavaScript runtime.
