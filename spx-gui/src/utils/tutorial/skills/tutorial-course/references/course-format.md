# What a course is made of

A course is a set of records, each a path and a file. The editor shows them as the parts of a course rather than
as directories, but the paths are what gets saved, and they follow one layout:

```text
index.json                     the course settings
main_course.gox                the course program
project/                       the embedded SPX project (its root is named in index.json)
assets/videos/<name>/          one video resource: a manifest plus its payload
assets/images/<name>/          one picture resource, same shape
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

Adding a resource in the editor is a matter of saying what it is. The type decides the directory and the
manifest; the name comes from the file and is made unique. Renaming a resource renames what the program
addresses, so the program has to be updated with it.

Videos are the kind the program can play (`showVideo`). Pictures are kept with the course, and no call addresses
them yet.

## Records the course does not use

A record that no part of the format claims is kept exactly as it is and saved with the course. That covers a
file uploaded as "something else", a directory under `assets/` without a manifest, and anything a newer format
version may add. The editor shows these together under one heading, by path, so nothing that will be saved is
hidden; the course program cannot reach them.

Records inside the embedded project belong to that project, and records inside a resource directory belong to
that resource; neither shows up as a loose file.

## Saving

Saving uploads the changed files and writes the course's content. It does not publish, and it does not touch the
title or the thumbnail. Preview does not save: it runs a snapshot of the working copy, so the course can be
tried before anything is written.
