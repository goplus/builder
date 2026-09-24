---
name: tutorial-course
description: Guidelines for authoring a Playground Course in XBuilder's Course Editor, covering what a course is made of, how its program drives the learner's session, and how the editor saves it. Use this skill when the task is about writing or changing a course, its program, its resources or its settings.
---

# Authoring a Playground Course

A Playground Course teaches by letting the learner work in a real XBuilder project while a Course program watches
and guides them. The author writes that program; the learner never sees it.

A course is made of four things:

- **The course program** (`main_course.gox`), written in XGo against the Tutorial Class Framework. It reacts to
  what the learner does, shows guidance, and decides when the course is complete.
- **The embedded project**, an ordinary SPX project the learner edits during the course. It is the starting point
  they are given, not a solution.
- **Course resources**, currently videos and pictures, addressed by the program by name.
- **The course settings**, which say where the learner's editor opens and what the learner-facing Copilot should
  know about this course.

Read `references/course-program.md` before writing or changing program code: it has the API surface, the
execution model and the XGo details that decide whether a program compiles. Read `references/course-format.md`
when the question is about files, resources, settings or saving.

## How a course runs

The program starts when the learner starts the course. Everything it does is a reaction: to the course starting,
to the project runtime logging something, to the learner completing a round with Copilot. There is no polling and
no main loop.

A typical lesson has the same three parts:

1. **Set the stage.** In `onStart`, narrow what the learner can use (`Editor.CodeEditor.filterAPIs`), state the
   task (`showPrelude`), and show them how if they need it (`showVideo`, `Spotlight.reveal`).
2. **Wait for evidence.** The project's own code prints something the course can recognise
   (`Editor.Runtime.onLog`), or the learner's code is read back (`Editor.Project.getCode`).
3. **Close the loop.** Judge the evidence, then `completeWith` a sentence of feedback.

Not every call the framework defines is wired into Preview yet, so a course that compiles may still stop at a
call the host does not implement. When a Preview run ends with "unsupported capability", that is this gap, not
the course's mistake; see goplus/builder#3419.

## Guidelines

- **Guide, do not solve.** The course exists so the learner writes the code. Show the shape of the answer, the
  API to use, or where to look. Never put the solution in a message.
- **Judge what the learner did, not what they typed.** Read the project (`Editor.Project.getCode`) or the
  runtime's output (`Editor.Runtime.onLog`) rather than guessing from the editor's state.
- **Name resources, not paths.** `showVideo "step-to"` addresses the video named `step-to`; the course never
  spells out where its file sits.
- **Keep messages short.** Every `showPrelude`, `showMessage` and `showVideo` blocks the learner until they
  dismiss it, so each one has to earn the interruption.
- **Say it in the learner's language.** The course's messages are written by the author, so they carry whatever
  language the course is written in; keep one language throughout a course.
- **One callback, one job.** Opening steps that must happen in order belong in a single `onStart`; independent
  reactions belong in their own callbacks.

## Working in the Course Editor

The activity bar along the left edge switches between the five parts of the course: the course itself (its
settings), the project, the videos, the pictures and the program. Files are never shown by path. Opening the
project shows the full SPX editor; ask about that project with the spx-project skill instead of this one.

- **Adding a resource**: the videos and pictures pages each have their own add button, so what is being added
  is never asked; the author only picks files. Each card's menu renames or deletes that resource.
- **Settings**: the course page edits the initial editor path and the Copilot instructions. The title and the
  thumbnail belong to course management, not here.
- **Copilot instructions** (`copilotContext`) are for the _learner's_ Copilot during the course. They are not
  instructions for the assistant helping the author write the course.
- **Preview** runs the unsaved working copy through the real learner-side lifecycle. It is the only way to see
  what the program actually does.
- **Saving** writes the course content; it does not publish anything and does not touch the course's title.
