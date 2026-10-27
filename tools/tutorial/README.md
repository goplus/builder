# Tutorial Class Framework

`tools/tutorial` is the class framework for Playground Courses. A Playground Course is an XGo program, `main_course.gox`,
that runs next to an embedded SPX project. It tells the learner what to do, watches what they do in the editor, and
decides when the goal is reached. The framework turns these calls into capabilities of the host, the Tutorial module in
spx-gui, and delivers host events back to the course's callbacks. It runs on the framework-neutral
[XGo Executor](../xgoexec/).

## For course authors

The guide for course authors is kept as a skill in [`skills/tutorial-course`](./skills/tutorial-course/), so that
people and the Course Editor's assistant read the same text: spx-gui links the directory in as a built-in skill.

- [`SKILL.md`](./skills/tutorial-course/SKILL.md): what a course is made of, how its program drives the learner's
  session, and how to work on a course in the Course Editor.
- [`references/course-program.md`](./skills/tutorial-course/references/course-program.md): the course program, from a
  first course to the execution model, run groups, the API reference and what happens when a call fails.
- [`references/course-format.md`](./skills/tutorial-course/references/course-format.md): the files a course is made of
  and its settings.

The contracts remain the source of truth:
[`tutorial-class-framework.go`](../../docs/develop/tutorial-v2/tutorial-class-framework.go) for the author-facing API and
[`module_TutorialFramework.ts`](../../docs/develop/tutorial-v2/module_TutorialFramework.ts) for the host side. Where the
guide and a contract disagree, the contract wins and the guide is out of date.

## Changing the framework

Read [AGENTS.md](./AGENTS.md) first. It lists the scheduler rules, how to classify a new capability, the two-sided wire
contract with `client.ts`, and the qexp export that `tools/xgoexec-bundle` regenerates after the exported API changes.
Update the contracts in `docs/develop/tutorial-v2` together with the code.
