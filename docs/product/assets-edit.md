# Asset Editing

In XBuilder, we allow users to modify the content of existing assets in the current [Project](./index.md#project), such as the images of Costumes and Backdrops, the visuals of Animations, and the audio of Sounds.

## Features

* Sprite editing
  - Costume
    + Direct editing (planned): Crop the image and adjust image size or offset.
    + AI editing: Modify the whole costume image or specific parts.
  - Animation
    + AI editing (planned): Adjust animation motion or specific visual parts.
* Backdrop editing
  - AI editing: Modify the whole backdrop image or specific parts.
* Sound editing
  - Direct editing: Trim audio, adjust volume, and preview playback.
  - AI editing (planned): Modify speech, sound effects, or background music content.

## Basic Concepts

There are two editing modes: direct editing and AI editing.

### Direct Editing

Users modify content or configuration with editor tools, and changes take effect directly.

### AI Editing

AI editing generates new versions from edit requirements, sharing task states and quota rules with [Asset Generation](./assets-gen.md#asset-generation). Each successful AI edit produces a Draft, which takes effect only once applied. A Draft includes the following information:

* Input: The input of this edit, including the version it is based on and the edit requirements.
* Result: The generated target object as a whole.

We call the period from the first AI edit requested on an object until the user applies or discards the result a round of editing. A round includes the following information:

* Original: The original version, i.e. the object before the round started.
* Drafts: The list of Drafts, in the order they were generated.
* Selected: The currently selected version, either Original or one of the Drafts.

## Core Mechanisms

### AI Editing Input and Output

The input to an AI edit includes:

* Selected: The currently selected version.
* Edit requirements: Either for the whole object, or for one or more localized positions, each with its own instruction.
* Context: The current Project Setting, and the Asset Setting of the target itself or of its owning Sprite.

Once new media content is generated, the configuration coupled to it updates as well:

* Costume: Resolution and Pivot update so the costume keeps its display size and alignment on stage.
* Animation: Duration updates.

### Draft Saving

* Until the user applies or discards them, Drafts and ongoing AI editing tasks are saved with the [Project](./index.md#project), and the project owner gets them back when reopening the Project.
* If the owning Sprite is deleted, its Drafts and ongoing tasks are cleared as well, and undoing the deletion does not bring them back.

### Draft Rollback

* Users can switch Selected to preview the Original or any Draft.
* A new AI edit starts from Selected, and any Drafts after Selected are replaced by the new result.

### Applying and Discarding

Users can replace the original object with Selected (which can be undone), or discard the round. Either action ends the round and clears the Drafts.

### Asset Setting Synchronization

After an object's content is modified (by saving a direct edit or applying a Draft), we update the corresponding [Asset Setting](./assets-gen.md#asset-setting) in the background, so that the description used by follow-up generation and by assets saved to the library stays consistent with the current content:

* Backdrop and Sound: Update to reflect the current content; if the asset had no Asset Setting yet (such as an uploaded local file), one is added.
* Sprite: Asset Setting only records traits shared across its Costume and Animation items. After those items are edited, added, or removed:
  - Traits that changed across all items update with them.
  - Traits that no longer match broaden to a more general description.
  - If all original items have been replaced, a fresh setting is generated from the new content.

## User Story

### Trimming and Previewing a Recorded Sound

After recording a voice line and adding it as a Sound, the user:

1. Plays the Sound and notices silence at the start and low volume.
2. Trims the opening silence and raises the volume.
3. Previews it again, then saves once satisfied.

### Editing a Character Costume with AI and Generating Follow-up Actions

Taking a Sprite with the setting "a fox wearing a red scarf" as an example, the user turns the scarf on its default Costume green as follows:

1. Open the default Costume, enter the edit requirement "turn the scarf green", and generate the first Draft.
2. Keep editing to generate a second Draft.
3. Close the page; when the Project is reopened later, both Drafts are still there.
4. Switch back to the first Draft and generate again; the new result replaces the second Draft.
5. Apply the preferred version; the Sprite switches to the new costume and keeps its display size and alignment on stage.
6. The Sprite's Asset Setting updates accordingly:
   - If the costumes have both red and green scarves, the setting becomes "a fox wearing a scarf".
   - If every costume now wears green, the setting becomes "a fox wearing a green scarf".
7. When a running Animation is later generated for this Sprite, it is based on the updated setting and the new costume.
