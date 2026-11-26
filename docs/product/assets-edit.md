# Asset Editing

Users can edit the image, animation, and audio content of existing assets in the current [Project](./index.md#project). Adding, deleting, renaming, and animation settings are covered in [XBuilder](./index.md) and [Animation](./animation.md).

## Background

Once assets are in a Project, users often need to adjust them to fit their game, such as trimming silence from the start of a recording, changing an accessory on a character costume, or modifying part of a backdrop.

Deterministic tool edits like trimming audio or adjusting volume can take effect as soon as they are saved. AI edits to images, animations, or audio take longer and do not always land on the first try, so users need to keep multiple drafts, compare them, step back to an earlier version, and apply the one they want. In addition, once an asset's content changes, its existing [Asset Setting](./assets-gen.md#asset-setting) can fall out of date and needs to update so follow-up generation and assets saved to the library stay accurate.

## Features

* Costume editing
  - AI editing: Modify the whole image or specific parts based on an existing costume.
  - Direct editing (planned): Crop the image and adjust dimensions or pivot.
* Backdrop editing
  - AI editing: Modify the whole image or specific parts based on an existing backdrop.
* Sound editing
  - Direct editing: Trim audio, adjust volume, and preview playback.
  - AI editing (planned): Modify audio content based on existing speech, sound effects, or background music.
* Animation editing
  - AI editing (planned): Modify motion or specific parts based on an existing animation.

## Basic Concepts

### Edit Targets

Asset editing works on `Costume`, `Backdrop`, `Animation`, and `Sound` objects in the current Project. Edits only change the objects in the current Project and leave published [Assets](./index.md#asset) in the library untouched.

Editing updates the complete asset object. When its image, frame sequence, or audio is replaced, its `Name`, code references, and bindings stay intact, while settings coupled to the media update together.

### Editing Modes

* Direct editing: Modifies content with deterministic editor tools without going through drafts.
* AI editing: Generates candidate versions from existing content and edit requirements, sharing task states and quota rules with [Asset Generation](./assets-gen.md#asset-generation). Results are kept as Drafts first and written to `Project.Game` only when applied.

### Draft

Each successful AI edit produces a Draft that records the input and candidate result from that run. Every edit target independently tracks its original version from when the round started, its ordered list of Drafts, and the currently selected version.

Like unfinished [Asset Generation](./assets-gen.md#asset-generation) records, ongoing AI editing tasks and Drafts are stored in the [Project](./index.md#project) outside `Project.Game`:

* They are saved to the cloud with the Project (and cached locally in the browser before syncing), and are restored when the project owner reopens that Project in the editor.
* Before a Draft is applied, it is only shown for preview and comparison inside that object's editing view, while stage execution, exports, releases, and saving to the asset library keep using the original version in `Project.Game`. Closing the editing view or saving the Project does not apply a Draft; it takes effect only when the user confirms applying a selected Draft, replacing the object in `Project.Game`.

## Core Mechanisms

### Direct Editing

Users adjust content in the editor with live preview or playback; cancelling restores the state before editing, while saving updates the target object in `Project.Game` directly and records an undo/redo entry.

### AI Editing

An AI edit starts from the currently selected version and generates a new version from the user's whole-asset or localized edit requirements; it also draws on the current `Project Setting` and the `Asset Setting` of the owning `Sprite`, `Backdrop`, or `Sound` when available.

Once a Draft is applied, the object in `Project.Game` updates to that version along with settings tied to its media:

* `Costume`: Updates resolution and `Pivot` for the new image so display size and alignment on stage stay consistent.
* `Animation`: Updates frame sequences and `Duration` for the new animation.

### Draft Rollback and Adoption

Users can switch between the original version and any Draft to preview them, and continue editing with AI from whichever version is selected. Stepping back to the original version or an earlier Draft and generating again places the new Draft right after that version and replaces the later Drafts; if a run fails or is cancelled, existing Drafts stay intact.

Applying writes the selected Draft to `Project.Game` and adds an undo/redo entry in the editor; discarding leaves the original version in `Project.Game` unchanged. Either action ends the round and clears that object's Drafts.

### Asset Setting Synchronization

`Costume` and `Animation` do not store separate [Asset Settings](./assets-gen.md#asset-setting); only `Sprite`, `Backdrop`, and `Sound` store them. After an asset's content in `Project.Game` changes, XBuilder updates the corresponding `Asset Setting` asynchronously in the background without blocking editing or running the game:

* `Backdrop` and `Sound`: Updates `Asset Setting` to reflect the modified content, or generates one if the asset had no setting yet (such as an uploaded local file).
* `Sprite`: `Asset Setting` only describes traits shared across its `Costume` and `Animation` items. When those items are edited, added, or removed, XBuilder updates the `Sprite` setting accordingly: changes shared across all items update together, traits that now differ broaden to what they still share, and if all original items are replaced, a fresh setting is generated from the new content.

## User Story

### Editing a Sound Shared by Multiple Animations

A user picks the same footstep `Sound` for both walking and landing animations, then opens the sound editor to trim the silence at the start, adjust the volume, and preview it. Saving updates that `Sound` in `Project.Game` directly, so both animations play the trimmed footstep sound.

### Editing a Character Costume with AI and Generating Follow-up Actions

After generating a `Sprite` with the setting "a fox wearing a red scarf", the user opens its default `Costume` and asks AI to turn the scarf green. After closing the page and reopening the Project, the drafts are still there; the user steps back to an earlier draft and generates again, replacing the later drafts.

Once the user applies a version they like, the game switches to the new costume, clears the round's drafts, and keeps the character's size and pivot aligned on stage. In the background, XBuilder updates the `Sprite`'s `Asset Setting`: broadening it to "a fox wearing a scarf" if other costumes still have a red scarf, or updating it to "a fox wearing a green scarf" if every costume now wears green. When the user later generates a running `Animation` for that `Sprite`, AI uses the updated setting and costume to keep the motion consistent.
