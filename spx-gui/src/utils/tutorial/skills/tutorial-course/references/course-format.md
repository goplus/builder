# What a course is made of

A course is a set of records, each a path and a file. The editor shows them as the parts of a course rather than
as directories, but the paths are what gets saved, and they follow one layout:

```text
index.json                     the course settings
main_course.gox                the course program
project/                       the embedded SPX project (its root is named in index.json)
assets/videos/<name>/          one video resource: a manifest plus its payload
```

## Settings (`index.json`)

```json
{
  "project": { "type": "spx", "root": "project" },
  "inEditorPath": "/sprites/Lita/code",
  "copilotContext": "Help the learner understand stepTo without writing the solution for them."
}
```

- `project.type` selects the editor the learner gets; `spx` is the only one today.
- `project.root` is the directory holding the embedded project.
- `inEditorPath` is where the learner's editor opens when the course starts.
- `copilotContext` is what the **learner's** Copilot is told about this course. It is the author's instructions
  for the assistant sitting next to the learner, not for the assistant helping the author.

The course's title and thumbnail are not in here: they belong to the course record itself and are edited in
course management.

## Resources

A resource is a directory holding a manifest (`index.json`) and one payload file. The directory name is the
resource's name, and that name is the whole address: `showVideo "step-to"` finds `assets/videos/step-to/`
whatever its payload is called. The manifest points at the payload and carries an editor-managed id; the editor
writes both, so a course program never reads a manifest and never needs a path.

Adding a video in the editor happens on the videos page: the page decides the directory and the manifest, and
the name comes from the file and is made unique. Renaming a video renames what the program addresses, so the
program has to be updated with it.

Videos are the only resources the program can address (`showVideo`). Pictures under `assets/images/` are kept with
the course too, but the editor does not show them yet and no call addresses them.

## Other records

Saving writes exactly the records described here, so any other record a course carries is not kept.

## Saving

Saving uploads the changed files and writes the course's content. It does not publish, and it does not touch the
title or the thumbnail. Preview does not save: it runs a snapshot of the working copy, so the course can be
tried before anything is written.
