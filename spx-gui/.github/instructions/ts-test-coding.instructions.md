---
applyTo: '**/*.test.ts'
---

Apply the [general TypeScript coding guidelines](./ts-coding.instructions.md) to all code.

Here are instructions for writing tests for TypeScript code in spx-gui:

* Use `describe` to group related tests.
* Check `src/utils/test.ts` for general utility functions.
* Check `src/models/project/index.test.ts` for examples of constructing mock `Project` instances.
* If test cases fail due to minor issues, fix them in the source code.
* If test cases fail due to complex reasons, leave the test case unchanged and add a comment explaining the issue.
* When running test cases, use the `--run` option to disable watch mode and get notified when tests finish. For example: `npm run test -- --run src/components/editor/editing.test.ts` runs tests in `editing.test.ts` in non-watch mode.
* It's OK to use type assertions like `as any` or `as unknown` to bypass type errors if you are sure of the types, but try to avoid them if possible.
* Avoid data sharing among test cases. Each test case should be independent and not rely on the state set by another test case.