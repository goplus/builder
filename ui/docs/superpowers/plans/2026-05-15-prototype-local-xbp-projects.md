# Prototype Local XBP Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Weathergggg.xbp` and `niu-run.xbp` as standalone offline prototype projects that appear in normal community/project/editor flows.

**Architecture:** Store the `.xbp` files and extracted thumbnails under `prototype/src/assets/projects/`, import them from `prototype/src/data/mock.ts`, and expose `projectFile`, `instructions`, and local preview metadata through existing mock project objects. Project detail and editor pages consume the same mock record so the prototype remains server-free and structurally aligned with the product.

**Tech Stack:** Vite, Vue 3, Vue Router, Tailwind CSS v4, local mock APIs, `scripts/check-prototype.mjs`.

---

### Task 1: Contract Check

**Files:**
- Modify: `prototype/scripts/check-prototype.mjs`

- [ ] Add checks that `src/data/mock.ts` registers `weathergggg`, `niu-run`, `projectFile`, and local project asset imports.
- [ ] Run `npm run test:prototype` from `prototype/` and confirm it fails before implementation.

### Task 2: Local Assets

**Files:**
- Create: `prototype/src/assets/projects/weathergggg/Weathergggg.xbp`
- Create: `prototype/src/assets/projects/weathergggg/thumbnail.jpg`
- Create: `prototype/src/assets/projects/niu-run/niu-run.xbp`
- Create: `prototype/src/assets/projects/niu-run/thumbnail.jpeg`

- [ ] Copy both desktop `.xbp` files into local prototype assets.
- [ ] Extract `builder-thumbnail.*` from each `.xbp` as its local project thumbnail.

### Task 3: Mock Data

**Files:**
- Modify: `prototype/src/data/mock.ts`
- Modify: `prototype/src/apis/project.ts`

- [ ] Extend `Project` with optional `projectFile` and `instructions`.
- [ ] Import the two project files and thumbnails.
- [ ] Add `Weathergggg` and `niu-run` to the start of `projects`.
- [ ] Add a helper to test whether a project has a local runnable project file.

### Task 4: Product Surfaces

**Files:**
- Modify: `prototype/src/pages/community/project.vue`
- Modify: `prototype/src/pages/editor/index.vue`

- [ ] On project detail pages, show the local project preview and make the run/open action point to the local `.xbp` when available.
- [ ] In the editor page, surface the selected local project file and keep interactions local.

### Task 5: Verification

**Files:**
- No new files.

- [ ] Run `npm run test:prototype`.
- [ ] Run `npm run build`.
- [ ] Inspect the changed routes in the local dev server.
- [ ] Confirm there are no imports from `spx-gui` and no real backend calls.
