---
name: xbcs-package
description: Unpack, edit, validate, and repack XBuilder course-series packages (`.xbcs.zip`) and the project files inside them (`.xbp`). Use this whenever the user mentions a course package, `.xbcs`, `.xbp`, 课程包, exporting or importing a course series, a course-package upload that failed or errored, a course that looks wrong after import, or wants to change a course's prompt / config / stage / assets and hand a package back for upload. Reach for it before repacking anything — rebuilding a `.xbp` with `zip -r`, Finder's Compress, or any GUI archiver silently corrupts it in a way the importer cannot survive, and the bundled script is the only safe way to rebuild one.
---

# Course-series packages (`.xbcs.zip`)

A course series round-trips through a single archive: **export → edit offline → import**. Editing
happens outside the app because a series is 30-odd courses × 40-odd files each, and nobody is going
to click through that. The archive is therefore the real authoring surface, and the importer trusts
it almost completely — there is one format check and then everything is taken at face value.

That trust is why this skill exists. A malformed archive does not get rejected with a helpful
message; it either dies mid-import having already overwritten half the projects, or imports
"successfully" into something broken. So: **always validate before handing a package back**, and
never rebuild a `.xbp` with a general-purpose zip tool.

## The trap, and why it matters

`xbpHelpers.load` ([spx-gui/src/models/common/xbp.ts](../../../spx-gui/src/models/common/xbp.ts))
turns **every zip entry** into a project file:

```ts
Object.keys(unzipped).map(async (path) => { ... files[path] = file })
```

The app's exporter builds `.xbp` from an in-memory file map via fflate, so it emits file entries and
nothing else. `zip -r`, Finder's Compress, WinRAR, Keka, 360压缩 and friends walk a real filesystem
and additionally write **directory entries** — `assets/`, `assets/sprites/Lita/` — which the loader
happily ingests as project files with a path ending in `/`, zero bytes, and an empty `File.name`.
Each one is then uploaded to storage and written into the project's file index. A 31-course package
picks up ~330 of them. That is the failure mode behind "the designer's upload doesn't work".

Two fingerprints tell you a `.xbp` was repacked by a filesystem tool: directory entries, and the
UTF-8 filename flag (general-purpose bit 11) missing on non-ASCII names. The app forces UTF-8
decoding so the flag alone is harmless, but it confirms the diagnosis.

`scripts/xbcs.py pack` writes only file entries, in the paths the manifest declares. Use it.

## Workflow

```bash
# 1. explode the archive — every .xbp becomes a directory you can edit
python3 .claude/skills/xbcs-package/scripts/xbcs.py unpack "in.xbcs.zip" work/

# 2. see what you're dealing with before touching anything
python3 .claude/skills/xbcs-package/scripts/xbcs.py inspect work/

# 3. edit files under work/ with normal tools

# 4. rebuild — reads the manifest and emits exactly the declared paths
python3 .claude/skills/xbcs-package/scripts/xbcs.py pack work/ "out.xbcs.zip"

# 5. prove it before handing it over
python3 .claude/skills/xbcs-package/scripts/xbcs.py validate "out.xbcs.zip"
```

`validate` also accepts an unpacked directory, so you can check your edits before packing. Run it on
the **input** too when you're diagnosing someone else's package — that is usually the whole job.

The unpacked layout mirrors the archive, with each `projects/N.xbp` exploded into `projects/N/`:

```
work/
├── course-series.json          # the manifest: series meta + courses[] + projects[]
├── thumbnails/course-series.jpeg
├── thumbnails/courses/0.jpg    # index = position in courses[]
└── projects/0/                 # was projects/0.xbp
    ├── builder-meta.json
    ├── main.spx, Lita.spx, …   # the code the learner sees
    └── assets/…                # index.json + costumes/sounds/backdrops
```

`pack` derives each `.xbp` path from `projects[].path` in the manifest rather than from the directory
listing, so a stray folder can't silently become a project and a renamed folder fails loudly instead
of producing a package that's missing an entry.

## What you can and can't change

Most edits are safe. These are the ones that bite:

- **`course-series.json` is the source of truth for paths.** If you add, remove, or reorder courses,
  the `courses[].thumbnail.path` and `projects[].path` values must keep matching real entries — the
  importer looks them up verbatim, case- and separator-sensitive, and a miss aborts the import.
- **`projects[].fullName` must cover every course's entrypoint project.** The importer rewrites
  `/editor/<owner>/<name>/…` entrypoints to point at the newly imported copies, but only for owners
  it has a mapping for. An entrypoint whose `<owner>/<name>` is absent from `projects[]` is left
  untouched, so the imported course silently points at the *original* owner's project and 404s at
  course-start time. `validate` catches this.
- **Costume, animation, sound and sprite names are referenced by the `.spx` code.** `setCostume "萝卜"`
  breaks the moment you rename that costume in `index.json`. Rename in both places or neither.
- **`builder-meta.json.type` must be `game`**; anything else is a hard import failure. Keep
  `displayName` equal to the manifest's `projects[].name` — a stale one (the usual leftover from
  duplicating a project) shows the wrong course number in the editor.
- **Length limits are server-enforced** and surface as an opaque `40001`: course title ≤200, course
  prompt ≤4000, series title ≤200, series description ≤400, project name ≤100 and `^[\w-]+$`.
- **The output filename must end in `.xbcs.zip`.** The import file picker filters on that exact
  suffix, so a `.zip` or `.xbcs` can't even be selected — an "upload problem" that never reaches any
  code.

For the course `prompt` itself — the ```jsonc config block, `opening`, `judge`/`complete`, `apis`,
`<course-story-video>` — follow [docs/product/course-authoring.md](../../../docs/product/course-authoring.md).
That document is the authority; don't restate its rules here.

## The edits that pass validation and still break the course

`validate` reasons about the file. It cannot know whether a course still *works*, and the most
damaging edits are the ones that leave the archive perfectly well-formed. A course is three things
that have to agree — the config, the project the config describes, and the prose the learner reads —
and an edit request usually names only one of them.

`complete.count` is the clearest case. It counts distinct output lines containing `complete.log`
within one run, so it is a claim about the project: setting it to 6 in a course whose stage holds
four carrots means the success dialog can never open, and the prose that says 「收集四个萝卜」 now
contradicts it. Nothing about that is detectable from the manifest.

The same shape recurs elsewhere: narrowing `apis` hides a panel entry the reference answer still
uses; an `opening` spotlight targets a landmark the course's `hide` list just removed; renaming a
sprite orphans an `entrypoint` that names it in its path.

So when an instruction changes one of the three, check the other two and say what you found. Carrying
out the edit and flagging the inconsistency is right; silently "fixing" the project or rewriting the
prose to match is not — which of the three was wrong is the author's call.

## Diagnosing a package someone else built

When a package fails to import, the useful question is not just "what is broken" but "what did they
actually change". Fetch or locate the last known-good export of the same series and compare: manifest
field by field, and each `.xbp`'s file map entry by entry.

That separates the two kinds of difference, which want opposite responses. Intended edits — a new
thumbnail, a reworded prompt — you preserve. Packaging damage — directory entries, dropped UTF-8
flags, `.DS_Store` — you discard wholesale by repacking. Without the comparison it is easy to
"repair" a package into something that quietly drops the author's work, or to preserve junk because
it looked deliberate.

It also answers a question the author will ask: whether this round contained any real change at all.
A package whose only differences are three broken hand-edits and a bad repack has no content to
preserve, and saying so plainly is more useful than handing back a fixed archive.

Deeper structure (manifest schema field by field, `.xbp` anatomy, sprite `index.json` layout, the
full list of import failure paths) lives in [references/format.md](references/format.md). Read it
when an edit goes beyond swapping text or images.

## Reading the validator

Output is `ERROR` / `WARN` lines plus a one-line verdict, and the exit code is non-zero when there
is at least one error.

- **ERROR** — the import will fail, or will succeed into something broken. Fix before handing over.
- **WARN** — legal but suspicious: a stale `displayName`, a thumbnail whose extension disagrees with
  its actual bytes, an asset extension the app has no MIME for, a zero-byte asset. Judge each on its
  merits; some are intentional (empty `main.spx` in a course with no starting code is normal).

When a package fails to import and `validate` is clean, the remaining suspects are not in the file:

- The person importing must be **signed in as the account that owns the series**. The importer looks
  up each `projects[].name` under the *signed-in* user; a non-owner gets 31 fresh projects created
  under their own account and then a 403 on the final series update.
- Import **overwrites** same-named projects under that account and forces them public, cutting a new
  release for each. That is by design, and the confirm dialog is the only warning.
- It is serial: N projects × ~40 file uploads, no transaction and no rollback. A rate limit or a
  network blip partway through leaves projects overwritten and courses orphaned. Retrying is safe
  (it's idempotent per project), but a partial run is a real state to reason about.

Say which of these you've ruled out rather than just reporting "the file is fine".

## Verifying behavior, not just structure

`validate` proves the package will import. It says nothing about whether a course *works* — whether
the stage lays out right, whether the code the learner is meant to write actually finishes, whether
`complete.log` / `complete.count` match what the project prints.

For that, drive the real engine through the dev-only harness at `/devtools/course-runner` (registered
only under `import.meta.env.DEV`, so local dev server only):

```js
await courseRunner.loadXbp('/0.xbp')            // served from spx-gui/public/
const r = await courseRunner.run({ code: { Lita: 'step 100\nturn Right' }, timeoutMs: 15000 })
r.logs  // [{ level: 'INFO', msg: '捡到萝卜 Radish', … }]
```

A page session only survives a handful of engine instances — reload between runs rather than
concluding the course broke.
