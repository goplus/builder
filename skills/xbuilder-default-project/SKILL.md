---
name: xbuilder-default-project
description: Maintain the XBuilder frontend's default project. Use when changing the initial sprites, backdrop, sounds, animation configuration, or thumbnail; do not use for general asset-library work.
---

# XBuilder Default Project

Use this skill when updating the template created by **New project...**. The template lives in `spx-gui/src/components/project/default-project/`; its construction code is `spx-gui/src/components/project/default-project.ts`.

## Prepare and export in XBuilder

Ask the project author to prepare the desired first-run state in the XBuilder editor before exporting:

- Set the stage's active backdrop, sprite order, sprite position/size, costumes, and animation bindings.
- Add every sound referenced by an animation and confirm the sound association in the animation editor.
- Check the project thumbnail; it is produced from the editor state and should match the intended default presentation.
- Export the project with **Project menu → Export project file**. Work from the resulting `.xbp`, not screenshots or separately downloaded assets.

An export may contain project code, fonts, metadata, inactive backdrops, and other authoring data. They are not automatically part of the frontend template.

## Select the template contents

An exported `.xbp` file is a ZIP archive. Extract it into a disposable working directory; on macOS, prefer `ditto -x -k <project.xbp> <directory>` because it preserves the UTF-8 Chinese names used by exported animation files better than `unzip`.

Read these files before copying anything:

- `assets/index.json` to identify the active backdrop (`backdropIndex`) and the sprite/sound order.
- `assets/sprites/<sprite>/index.json` to capture placement, costumes, animations, and sound references.
- `assets/sounds/<sound>/index.json` for each referenced sound.

Copy only the requested user-facing defaults. The normal set is:

1. The selected backdrop file.
2. Each selected sprite directory, including its `index.json` and every referenced costume/animation file.
3. Sounds required by selected animations, including each sound's configuration and audio file.
4. The exported `builder-thumbnail.*` when the template preview should match the exported project. Copy it to `default-project/thumbnail.jpeg`, outside `assets/`.

Do not copy `main.spx`, `<Sprite>.spx`, fonts, `builder-meta.json`, inactive backdrops, or unrelated stage configuration unless the request explicitly calls for them. Delete obsolete template assets when replacing a default, so the frontend bundle does not retain unused old resources.

Use English asset filenames and display names when requested. Update both the copied filename and the path/name used in `default-project.ts`; do not rename an animation file without updating its sprite configuration.

## Wire the selected resources into the template

`default-project.ts` loads stage, sprite, and sound files under `default-project/assets/` through `import.meta.glob`. Keep those files under that tree so `getTemplateAssets()` exposes their archive-relative paths. The thumbnail is an exception: it is loaded separately from `default-project/thumbnail.jpeg` with `new URL(...)`.

- Create the stage backdrop from the selected asset and use the intended display name.
- Load all template sounds with `Sound.loadAll(files)` and add them to the `SpxProject` before loading sprites. Pass the same `sounds` array to `Sprite.load` so animation sound names resolve to sound IDs.
- Load only the intended default sprite(s), then add them to the project.
- Preserve the existing project font-preference behavior unless the request specifically changes it.

## Verify in the editor

For an end-to-end check, start the local app and create a uniquely named temporary project. Creating it writes to the configured service, so obtain explicit authorization before submitting the creation form or logging in with a test account.

In the created editor, verify:

- The intended backdrop is active and its displayed name matches the template.
- The expected sprite appears at the exported position (the quick-config coordinates and preview should agree).
- The Sound tab lists every required sound.
- The sprite's animations and sound bindings are available.
