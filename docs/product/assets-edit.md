# Asset Editing

Users can modify the image, animation visuals, and audio content of existing assets in the current [Project](./index.md#project). Adding, deleting, renaming, and general property settings (such as animation duration and state bindings) are covered in [XBuilder](./index.md) and [Animation](./animation.md).

Once assets are in a Project, users often need to adjust them to fit their game, such as trimming silence from the start of a recording, changing an accessory on a character costume, or modifying part of a backdrop.

Deterministic tool edits like trimming audio or adjusting volume can take effect as soon as they are saved. AI edits to images, animations, or audio take longer and do not always turn out as expected, so we keep AI results as drafts first. Users can compare versions, step back to an earlier one and try again, and apply the one they want.

Once an asset's content changes, its existing [Asset Setting](./assets-gen.md#asset-setting) may no longer match the content and needs to update; otherwise follow-up generation and assets saved to the library would still use the old description.

## Features

* Costume editing
  - AI editing: Modify the whole costume image or specific parts.
  - Direct editing (planned): Crop the image and adjust image size or offset.
* Backdrop editing
  - AI editing: Modify the whole backdrop image or specific parts.
* Sound editing
  - Direct editing: Trim audio, adjust volume, and preview playback.
  - AI editing (planned): Modify speech, sound effects, or background music content.
* Animation editing
  - AI editing (planned): Adjust animation motion or specific visual parts.

## Basic Concepts

### Edit Targets

Asset editing targets Costume, Backdrop, Animation, and Sound objects in the current Project. Edits affect only the current Project and do not change existing [Assets](./index.md#asset) in the library; an object's Name, code references, and state bindings also stay the same.

### Editing Modes

* Direct editing: Adjusts content with editor tools and takes effect in the Project once saved.
* AI editing: Generates candidate versions from edit requirements, sharing task states and quota rules with [Asset Generation](./assets-gen.md#asset-generation); results are kept as Drafts first and take effect once applied.

### Draft

Each successful AI edit produces a Draft containing the input of that edit and the generated target object as a whole.

For each edit target, a round of editing includes the following information:

* Original version: The object before the round started.
* Drafts: The list of Drafts in the order they were generated.
* Selected version: The original version or one of the Drafts.

Until the user applies or discards them, ongoing AI editing tasks and Drafts are saved with the [Project](./index.md#project), and only the project owner gets them back when reopening the Project in the editor; they do not enter the Project's Game content. Drafts are previewed and compared only inside that object's editing view, and closing the editing view or saving the Project does not apply them.

## Core Mechanisms

### Direct Editing

Users can preview or listen in real time while adjusting content; cancelling restores the state before editing, while saving updates the target object and records an undo/redo entry.

### AI Editing

The input to an AI edit includes:

* The currently selected version.
* The edit requirements: an instruction for the whole asset, or separate instructions for one or more localized positions.
* The current Project Setting, and the Asset Setting of the owning Sprite, Backdrop, or Sound when available.

Each run produces a complete target object. Besides the new image, animation frames, or audio, related settings also update and are stored in the Draft:

* Costume: Updates resolution and Pivot for the new image so the costume keeps its display size and alignment on stage.
* Animation: Updates frame sequences and Duration for the new animation.

### Draft Rollback and Adoption

Users can switch between the original version and any Draft to preview them, and continue editing with AI from whichever version is selected. Stepping back to the original version or an earlier Draft and generating again places the new Draft right after that version and replaces the later Drafts; if a run fails or is cancelled, existing Drafts stay intact.

Applying replaces the original object with the selected Draft and adds an undo/redo entry in the editor; discarding leaves the original object unchanged. Either action ends the round and clears that object's Drafts.

### Asset Setting Synchronization

In a Project, only Sprite, Backdrop, and Sound objects, which can be saved as standalone Assets, retain their own [Asset Setting](./assets-gen.md#asset-setting); Costume and Animation do not store separate settings. After the content of these objects changes and takes effect, XBuilder updates the corresponding Asset Setting in the background while the user keeps editing and running the game:

* Backdrop and Sound: Updates Asset Setting to reflect the modified content, or generates one if the asset had no setting yet (such as an uploaded local file).
* Sprite: Asset Setting only records traits shared across its Costume and Animation items. After those items are edited, added, or removed, traits that changed across all items update with them; traits that no longer match broaden to a more general description; if all original items have been replaced, a fresh setting is generated from the new content.

## User Story

### Trimming and Previewing a Recorded Sound

A user records a voice line as a Sound and notices silence at the start and low volume during playback. They trim the opening silence, raise the volume, and preview it again in the sound editor; saving updates that Sound immediately.

### Editing a Character Costume with AI and Generating Follow-up Actions

After generating a Sprite with the setting "a fox wearing a red scarf", the user opens its default Costume and asks AI to turn the scarf green. They try two drafts and close the page; when they reopen the Project, the drafts are still there. They switch back to the first draft and generate again, and the new result replaces the second draft.

The user applies the version they like. The Sprite switches to the new costume, the round's drafts are cleared, and the character keeps its display size and alignment on stage. XBuilder then updates the Sprite's Asset Setting in the background: if other costumes still have a red scarf, the setting becomes "a fox wearing a scarf"; if every costume now wears green, it becomes "a fox wearing a green scarf". When the user later generates a running Animation for that Sprite, it is based on the updated setting and the new costume.
