---
name: prototype-maintenance
description: Use when creating, updating, or validating Builder UI prototypes under ui/prototype from Pencil design changes. Applies when the task mentions prototype, ui/prototype, Pencil page changes, syncing a .pen page to a runnable preview, or keeping the prototype aligned with the real Builder frontend.
---

# Prototype Maintenance

Use this skill when maintaining `ui/prototype` for Builder design work.

## Goal

`ui/prototype` is a runnable product prototype, not an isolated static demo. It should reflect the current Pencil design change while staying aligned with the real Builder frontend structure and behavior.

## Required Workflow

1. Start from the real frontend.
   - Inspect the corresponding implementation in the current Builder frontend before editing prototype code.
   - Reuse the same page structure, routing model, component boundaries, styling approach, and interaction logic where practical.
   - Do not invent a standalone demo architecture.

2. Ensure the target prototype surface exists.
   - If `ui/prototype` does not have the page or UI being changed, initialize it from the current real frontend structure.
   - If it exists but has drifted from the real frontend organization, align the structure first, then apply the design change.

3. Apply only the current design change.
   - Sync the latest relevant Pencil page change into `ui/prototype`.
   - If only `tutorial.pen` changed, only override the tutorials surface.
   - Other pages, routes, and features must continue to use or mirror the original real frontend behavior and remain accessible.

4. Keep edits scoped.
   - Write prototype-related changes only under `ui/` unless the user explicitly authorizes a broader scope.
   - Do not modify `spx-gui/` or other non-`ui/` directories by default.

5. Make the preview runnable.
   - `ui/prototype` must be able to start a frontend preview environment from inside that directory.
   - The preview should behave like Builder's existing frontend preview environment, with only the intended prototype surface changed.

## Validation

Before claiming completion, run the relevant prototype checks.

At minimum, verify:

- The preview environment starts.
- The changed page is accessible.
- Important unchanged pages still load.
- Navigation, search, course-card navigation, project pages, and other key flows still work when relevant.
- The changed page visually matches the latest Pencil design.

If preview behavior is broken, debug it before finishing. The target state is: real Builder frontend preview behavior plus local prototype overrides for the changed design surface.

## Output Expectations

When reporting the result, include:

- Which Pencil page or design surface was synced.
- Which real frontend files or structures were used as reference.
- Which `ui/` files changed.
- Which validation steps were run, and any remaining gaps.
