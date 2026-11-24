# Asset Editing

Users can edit the image or audio of a resource in the current Project. A confirmed edit takes effect wherever the Project uses that resource.

## Features

### Editing a Sound

Users can trim the audio, adjust its volume, and preview the result. Once they save the clip, the edited audio plays wherever the Sound is used.

### Editing a Costume

Users can edit the image of each Costume in a Sprite's costume list independently. An AI edit can change the whole image or selected areas. Each successful edit produces a draft.

When the user applies a draft, the game uses the selected image immediately. AI updates the description in that Costume's Asset Setting to match the image, revising only the details affected by the edit. Builder uses the revised description the next time it generates that Costume.

### Editing a Backdrop

Users can ask AI to change the whole Backdrop image or selected areas, then apply the draft they want to use as the current backdrop.

## User Story

### Editing a Sound Shared by Multiple Animations

A user chooses the same footstep sound for a walking animation and a landing animation. They trim the silence from the start of the recording, adjust the volume, and preview the result. Once they save the edit, both animations play the edited footstep sound.

### Editing a Costume or Backdrop with AI

Users can describe a change to the whole image or give separate instructions for one or more areas. Drafts are saved with the Project's editing state. After reopening the Project, users can continue from the image they started this round with or from any draft. A new draft based on an earlier version replaces the drafts that followed it.

Users can apply the version they prefer or discard their edits to keep the image they started this round with. Either choice clears the drafts from this round of editing for that image.

Project exports (`.xbp`), releases, and assets saved to the library include only the version of the image in use. A remix inherits that image from its source release.
