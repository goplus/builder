# `.xbcs.zip` / `.xbp` reference

Read this when an edit goes beyond swapping text or images — when you need to know exactly what a
field means, what the importer does with it, or how a project's assets are wired together.

- [Archive layout](#archive-layout)
- [The manifest](#the-manifest)
- [Inside a `.xbp`](#inside-a-xbp)
- [Asset configs](#asset-configs)
- [What import actually does](#what-import-actually-does)
- [What export actually does](#what-export-actually-does)

Source of truth, if this drifts:
[course-series-file.ts](../../../../spx-gui/src/components/course/management/course-series-file.ts) (import/export),
[xbp.ts](../../../../spx-gui/src/models/common/xbp.ts) (project payload),
[zip.ts](../../../../spx-gui/src/utils/zip.ts) (filename decoding).

## Archive layout

```
course-series.json                 # the manifest
thumbnails/course-series.<ext>
thumbnails/courses/<i>.<ext>       # i = position in courses[]
projects/<j>.xbp                   # j = position in projects[]
```

Indices in the file names are only conventional — the manifest's `path` fields are what the importer
reads, verbatim and case-sensitively. Nothing outside those declared paths is looked at, so extra
entries are inert (and a wrapping top-level folder is fatal: the manifest is no longer at the root).

## The manifest

```jsonc
{
  "format": "xbuilder-course-series",   // both checked; the only friendly error the importer gives
  "version": 2,
  "courseSeries": {
    "title": "Code: Lita",              // <=200
    "description": "…",                 // <=400
    "thumbnail": { "path": "thumbnails/course-series.jpeg" }
  },
  "courses": [{
    "title": "1. 你好，Lita",            // <=200
    "entrypoint": "/editor/curator/Lita-Course-01/sprites/Lita/code",
    "prompt": "```jsonc\n…\n```\n\n## 目标\n…",   // <=4000; see docs/product/course-authoring.md
    "thumbnail": { "path": "thumbnails/courses/0.jpg" }
  }],
  "projects": [{
    "fullName": "curator/Lita-Course-01",  // the exported source, used as a rewrite key
    "name": "Lita-Course-01",              // ^[\w-]+$, <=100; the name created on import
    "path": "projects/0.xbp"
  }]
}
```

**The version is decided by the deployment, not by your checkout.** The importer compares it for
exact equality and rejects every mismatch with the same opaque *"Unsupported course series file
format"* — the message names no version and does not say which side is newer. v1 → v2 (upstream
#3381) only removed `courses[].references`, so a package can otherwise be converted by editing two
things. Before building a package for someone else to upload, **export the target series once and
read the `version` it writes**; a local branch can easily sit on the older number while the site
they import into has moved on.

`courseSeries.order` is deliberately not exported — sort order depends on the other series in the
target environment, so import keeps the local value.

`courses` and `projects` are independent lists joined only through `entrypoint` / `references`. There
is no requirement that they be the same length or in the same order, but every course's entrypoint
project must appear in `projects[]`, otherwise the importer can't rewrite the owner and the course
ends up pointing at the export's original owner. That failure is silent at import time and shows up
as a 404 when a learner opens the course.

`fullName` is a *lookup key*, not a destination: import maps `fullName` → whatever it actually created
(`<signed-in-user>/<name>`) and rewrites entrypoints and references through that map. Only exact
`owner/name` segment matches are rewritten, so `curator/Lita-Course-1` is not touched by a mapping
for `curator/Lita-Course-01`.

## Inside a `.xbp`

A `.xbp` is a zip whose every entry becomes a project file, with two names treated specially:

```
builder-meta.json            # { type, displayName, description, instructions, extraSettings }
builder-thumbnail.<ext>      # optional; recognized by basename, becomes the project thumbnail
main.spx                     # stage code
<Sprite>.spx                 # per-sprite code
assets/index.json            # stage config (backdrops, map, …)
assets/<backdrop>.png
assets/sprites/<Name>/index.json
assets/sprites/<Name>/<costume>.png|svg
assets/sounds/<Name>/index.json
assets/sounds/<Name>/<sound>.wav|mp3
```

`type` must be `game`; a missing `type` defaults to `game` for backward compatibility, anything else
is a hard failure. `displayName` should equal the manifest's `projects[].name` — import uses
`serialized.metadata.displayName ?? project.name`, so a stale value survives and mislabels the
project in the editor.

Everything else in the zip is copied verbatim into the project's file map, keyed by its zip path.
This is why directory entries are destructive: `assets/sprites/Lita/` becomes a project file at that
path, zero bytes, with `File.name === ''` (the segment after the final slash). See SKILL.md.

## Asset configs

The `.spx` code addresses assets **by name**, so names in these configs are part of the program.
`setCostume "萝卜"` and `animate "行走"` break if you rename the costume or animation without editing
the code too.

**Sprite** — `assets/sprites/<Name>/index.json`:

```jsonc
{
  "costumes": [
    { "name": "kiko", "path": "kiko.png",
      "x": 75, "y": 72,             // pivot, in RAW image pixels
      "bitmapResolution": 4 }       // displayed size = raw / bitmapResolution (1 for SVG)
  ],
  "fAnimations": {
    "行走": { "frameFrom": "…-1", "frameTo": "…-6", "frameFps": 10,
              "onStart": { "play": "草地行走" } }
  },
  "animBindings": { "step": "行走" },  // which animation an action plays
  "heading": 90,
  "rotationStyle": "normal",          // none | normal | left-right
  "faceRight": 0
}
```

`frameFrom`/`frameTo` name a **contiguous range** of costumes in `costumes[]` order — the frames
between them are played in array order, so inserting a costume in the middle silently changes an
animation.

**Every sprite needs at least one costume no animation references.** The editor's sprite model
pulls animation-referenced costumes out of the wearable-costume list (frames are not costumes
there); a sprite whose animations consume every costume loads with an empty costume list and
renders **nothing in edit mode** — while the engine does no such extraction, so the game and the
course-runner harness look perfectly fine. That split (runtime OK, editor invisible) is the
signature. `validate` checks this.

`rotationStyle: "normal"` rotates the artwork with the heading, which is what top-down art drawn
**facing right** wants. Art drawn facing down looks wrong under any rotation style; the fix is the
artwork, not the config.

**Sound** — `assets/sounds/<Name>/index.json`: `{ "path": "水声.wav", … }`.

**Stage** — `assets/index.json`: backdrops and map config, with `backdrops[].path` relative to
`assets/`.

Paths in these configs resolve relative to the config's own directory (a leading `assets/` also
works). `xbcs.py validate` checks every one of them.

## What import actually does

Order matters because there is no transaction and no rollback:

1. **For each project, serially**: load the `.xbp`; look up `<signed-in-user>/<name>`; if it exists,
   **overwrite it** (files, thumbnail, displayName) and force `visibility: public`; otherwise create
   it. Then cut a project release.
2. **For each course, serially**: upload its thumbnail, rewrite `entrypoint` and `references` through
   the project map, create the course.
3. Update the series to point at the new course IDs.
4. Delete the old courses.

Consequences worth stating out loud when you hand a package over:

- The importer must be **signed in as the account that owns the series and the projects**. A
  non-owner silently creates a full parallel set of projects under their own account and then fails
  on step 3 with a 403.
- Same-named projects are **overwritten and published**, and the confirm dialog is the only warning.
- A failure at any step leaves projects already overwritten and released, courses possibly created,
  and the series still pointing at the old ones. Re-running is safe per project but the intermediate
  state is real.
- It is N × ~40 serial file uploads. Rate limiting (`42900` / `42901`) is a plausible failure on a
  large series and looks like a random mid-import death.

Server-side limits surface as bare API codes: `40001` invalid args (the length limits above, or a
project name outside `^[\w-]+$`), `40300` forbidden, `40301` quota, `41300` content too large,
`41500` unsupported media type.

The importer's only schema check is `format` + `version`. Everything else — missing `projects`,
`courses` not an array, a `thumbnail` that isn't an object — comes out as an unguarded `TypeError`
behind a generic "failed to import" toast. That is why `xbcs.py validate` checks these itself.

## What export actually does

Exports come from the **latest release** for public projects and the draft otherwise
(`preferPublishedContent = true`), so an exported archive is not necessarily what the curator last
saved. A referenced project that is private or belongs to someone else aborts the export with a
403/404.

Thumbnails are named from the stored file's own name, which for storage keys usually has no
extension — so real exports frequently emit `.jpg` for what is actually PNG or WebP bytes. That is
where "extension disagrees with the actual image data" warnings come from; they are inherited, not
something you introduced, and the app tolerates them.

Export requires every thumbnail to already be uploaded, and drops `courseSeries.order` by design.
