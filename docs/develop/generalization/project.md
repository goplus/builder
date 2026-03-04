# Project Model Generalization: Technical Design

Related issues: [goplus/builder#2804](https://github.com/goplus/builder/issues/2804) · [goplus/builder#2813](https://github.com/goplus/builder/issues/2813) · PR #2827

## Background

XBuilder was originally built exclusively for spx projects. All editor components — `History`, `Editing`, `CodeEditor`, etc. — depended directly on `SpxProject` and the spx domain model (`Stage`, `Sprite`, `Sound`, …). To support other XGo class frameworks (e.g., `yap`, future user-defined frameworks), these components need to be decoupled from spx.

The first step was to introduce a general `IProject` interface and reorganize the model layer so the boundary between spx-specific and framework-agnostic code is explicit.

## What Was Done (PR #2827)

### 1. Introduced `IProject` interface

`spx-gui/src/models/project.ts` defines the minimal, file-based project interface that any project type must satisfy:

```ts
export interface IProject {
  mutex: Mutex
  owner?: string
  name?: string
  setMetadata(metadata: Metadata): void
  loadFiles(files: Files, signal?: AbortSignal): Promise<void>
  exportFiles(): Files
  load(serialized: ProjectSerialized, signal?: AbortSignal): Promise<void>
  export(signal?: AbortSignal): Promise<ProjectSerialized>
}
```

The interface is intentionally minimal — it models a project purely as a named, serializable collection of files with transactional access via `mutex`. It knows nothing about sprites, sounds, or any other domain-level concept.

Supporting types:

- `Files` — `Record<string, File>` (general file map from `models/common/file`)
- `ProjectSerialized` — `{ metadata: Metadata, files: Files }` (snapshot for save/load)
- `Metadata` — `Partial<CloudMetadata>` plus `aiDescription?` / `aiDescriptionHash?` (the latter two are acknowledged as spx-specific with a TODO to relocate)

Key design notes on `exportFiles()`:
- Reactive: dependents re-run when files change
- Memoized: safe to call from computed/watchEffect
- May yield intermediate results while an async operation is in progress; callers should hold `mutex` if they need a consistent snapshot

### 2. Reorganized model directory

All spx-specific models were moved from `src/models/` root into `src/models/spx/` to make the boundary explicit:

```
src/models/
  project.ts          ← IProject, Metadata, ProjectSerialized  (general)
  common/             ← File/Files, cloud helpers, hash, XBP format, MockProject  (general)
  spx/                ← SpxProject, Stage, Sprite, Sound, Backdrop, Costume, Animation, Widget, Tilemap, …  (spx-specific)
```

### 3. Generalized `History`

`History` moved from `models/project/history.ts` to `components/editor/history.ts` and now depends solely on `IProject`:

```ts
export class History {
  constructor(private project: IProject, private maxLength = 100) {}
  // uses only: project.mutex, project.exportFiles(), project.loadFiles()
}
```

`History` captures snapshots of `Files` before/after each action using `doAction(action, fn)`. It supports undo/redo and optional merging of adjacent actions. It is completely unaware of spx domain objects.

### 4. Generalized `Editing`

`Editing` (cloud + local-cache save orchestration) in `components/editor/editing.ts` also depends only on `IProject`:

```ts
export class Saving {
  constructor(project: IProject, cloudHelper: CloudHelpers, localCacheHelper: ILocalCache, isOnline: WatchSource<boolean>, signal: AbortSignal)
}
export class Editing {
  constructor(project: IProject, cloudHelpers: CloudHelpers, localCacheHelper: ILocalCache, isOnline: WatchSource<boolean>, signedInUsername: string | null)
}
```

`Editing` uses `project.export()` / `project.load()` / `project.setMetadata()`. Its whole save/load/auto-save cycle is generic.

### 5. `SpxProjectWithGens` composition adapter

`EditorState` internally creates a `SpxProjectWithGens` adapter that composes `SpxProject` and `GenState` into a single `IProject`:

```ts
class SpxProjectWithGens implements IProject {
  constructor(private project: SpxProject, private genState: GenState) {}

  exportFiles() {
    return { ...this.project.exportFiles(), ...this.genState.export() }
  }
  async loadFiles(files) {
    await Promise.all([this.project.loadFiles(files), this.genState.load(files)])
  }
  // … likewise for load(), export(), mutex, owner, name, setMetadata()
}
```

`Editing` (and anything else that takes `IProject`) receives this composed view, so AI-generated files are transparently included in saves and visible to the language server.

This adapter demonstrates the key benefit of the interface: additional file sources can be mixed in without changing `Editing` or any other consumer.

### 6. `MockProject` for testing

`src/models/common/test.ts` provides a `MockProject` that implements `IProject` using `vi.fn()` stubs:

```ts
export class MockProject implements IProject {
  mutex = new Mutex()
  constructor(public owner?: string, public name?: string, files: Files = {}) {}
  setMetadata = vi.fn(...)
  loadFiles = vi.fn(...)
  exportFiles = vi.fn(...)
  load = vi.fn(...)
  export = vi.fn(...)
}
```

This allows `History`, `Editing`, and any future generic component to be unit-tested without a real `SpxProject` or spx domain objects.

## Current State

### What is now framework-agnostic

| Component | Depends on |
|---|---|
| `History` | `IProject` only |
| `Editing` (`Saving`, `Editing`) | `IProject` only |
| `SpxProjectWithGens` | Composes `SpxProject + GenState` → `IProject` (internal to `EditorState`) |
| `MockProject` | `IProject` only |
| `models/common/` (`file`, `cloud`, `hash`, `xbp`, `local`) | No spx dependency |

### What remains spx-specific (future work)

| Component | Dependency | Relevant issue |
|---|---|---|
| `EditorState` | Constructor takes `SpxProject`; `selected` / `selectResource` reference spx types | #2804 |
| `Runtime` | Constructor takes `SpxProject` | #2803 |
| `GenState` | Takes `SpxProject` | #2804 |
| `CodeEditor` | Takes `SpxProject`; deeply coupled to spx APIs | #2803 |
| `StageEditorState` / `SpriteEditorState` | spx domain objects | #2804 |

## Design Decisions

**Interface over generics** — `IProject` is a plain TypeScript interface, not a generic class. This keeps the call sites simple (`History(project: IProject)` vs `History<P extends IProject>(project: P)`) and is consistent with how `SpxProject` already relates to the rest of the app.

**File-centric abstraction** — `IProject` only requires the ability to serialize/deserialize as `Files`. All domain-level concepts (sprites, sounds, etc.) stay in the concrete implementation. This is the narrowest interface that satisfies `History` and `Editing` without over-constraining future project types.

**`mutex` on the interface** — Transactional safety (`mutex.runExclusive`) is a cross-cutting concern that all consumers of a project need. Putting `mutex` on the interface ensures consumers can safely sequence operations regardless of project type.

**`aiDescription` in `Metadata` (acknowledged TODO)** — These fields are spx-specific but placed in the shared `Metadata` type for now. They will be relocated when a second project type is introduced and the right abstraction becomes clear.
