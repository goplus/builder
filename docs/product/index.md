# XBuilder

XBuilder is an editor that aims for game projects. The game is implemented based on spx technology, which is a game engine based on the XGo language.

The target users of XBuilder are children around 10 years old who are learning programming.

## Basic Concepts

The basic concepts in XBuilder are:

* User
* Project
* Stage
* Sprite
* Costume
* Sound
* Backdrop
* Asset

### User

User contains the following information:

* Name: A readable and globally unique identifier, such as "alice"; Name information cannot be changed.

A User can have 0 or more Projects & Assets. Adding operations of Projects & Assets in the cloud need to be performed with a user identity. We say that the User owns these Projects & Assets.

Currently, the ownership relationship between User and Project or Asset cannot be changed.

### Project

Project contains two parts of information:

1. Basic information of the Project
2. Game: The game content corresponding to the Project

The basic information includes:

* Name: The name of the Project, it is a unique identifier for the Project under the current User, such as "my-test-game"; Name information cannot be changed.
* IsPublic: After the Project is saved to the cloud, you can choose whether it is public; public Projects can be read by others.
* Others, such as creation time, update time, etc.

In addition, the game content Game corresponding to the Project includes:

* Stage: Stage information, which contains the global state, logic, background, etc. during the game runtime; one Project corresponds to one Stage.
* Sprites: Sprite list, one Project can correspond to 0 or more Sprites.
* Sounds: Sound list, one Project can correspond to 0 or more Sounds.
* Zorder: Z-axis order, which records the order of all Sprites (and other special content) in the Z-axis of the current Project, that is, the rendering hierarchy.
* Config: Other configuration information, such as camera behavior.

A Project corresponds to a runnable game. It can be seen as the result of "performing" 0 or more Sprites on a Stage, and Sound can be used (played) by the Stage or Sprite in the same Project during the performance.

Because User Name is globally unique, and Project Name is unique under the current User, a Project can be uniquely identified by User Name + Project Name. For example, we can use `alice/my-test-game` to identify the Project named `my-test-game` owned by User `alice`.

### Stage

Stage contains the following information:

* Script: The script that describes the running logic of the Stage.
* Backdrops: Backdrop list, one Stage can correspond to 0 or more Backdrops.
* Config: Other configuration information, such as the selection of the default Backdrop, stage size, etc.

### Sprite

Sprite contains the following information:

* Name: The name, unique within the Project it belongs to.
* Script: The script that describes the running logic of the Sprite.
* Costumes: Costume list, one Sprite can correspond to one or more Costumes.
* Config: Other configuration information, such as the selection of the default Costume, initial position, direction, size, visibility, etc.

### Costume

Costume contains the following information:

* Name: The name, unique within the Sprite it belongs to.
* Image: The image, one Costume corresponds to one image.
* Config: Other configuration information, such as relative position, resolution, etc.

### Sound

Sound contains the following information:

* Name: The name, unique within the Project it belongs to.
* Audio: The audio, one Sound corresponds to one audio file.

### Backdrop

Backdrop contains the following information:

* Name: The name, unique within the Project it belongs to.
* Image: The image, one Backdrop corresponds to one image.
* Config: Other configuration information, such as relative position, resolution, etc.

### Asset

Asset is a collective term for independently published reusable content in a Project. The content can have various formats, such as Sprite, Sound, Backdrop, etc. During the process of creating a game, users can independently publish these relatively fragmented and reusable content to allow themselves or others to reuse them in other Projects.

Asset contains the following information:

* DisplayName: The display name, a simple description of the Asset. The DisplayName of different Assets can be the same.
* Content: The content, which can be a Sprite, a Sound, or a Backdrop.
* AssetType: The content format, indicating which type of content the Asset contains, such as Sprite, Sound, or Backdrop.
* Category: The category, a simple classification of the usage scenario of the Asset, such as food, animals, sports, etc., to facilitate users to filter based on the usage scenario.
* IsPublic: After the Asset is saved to the cloud, you can choose whether it is public; public Assets can be read and used by others.
* ClickCount: Popularity, reflecting the popularity of an Asset (especially public Assets).

## User Story

Here is a brief description of the logic corresponding to several basic user scenarios of XBuilder:

### Project Creation and Saving

Users can create a new Project through XBuilder and then edit it:

* Edit Project Name
* Edit Stage information
	- Write global Script (details TODO)
	- Add and edit Backdrop information
		+ Set Backdrop Name
		+ Upload Image
		+ Modify other Backdrop Config (details TODO)
	- Modify other Stage Config (details TODO)
* Add and edit Sprite
	- Set Sprite Name
	- Write Sprite Script (details TODO)
	- Add and edit Costume information
		+ Set Costume Name
		+ Upload Image
		+ Modify other Costume Config (details TODO)
	- Modify other Sprite Config (details TODO)
* Add and edit Sound
	- Set Sound Name
	- Upload or record Audio (details TODO)
* Control Zorder (control the order of different content)

During the editing process, users should be able to get feedback from the preview area and see all the content on the current stage in real-time (displayed according to Zorder).

During the editing process, users can choose to run the Project. Running the Project means running the game corresponding to the Project in the browser (based on the Game content in the current Project).

During or after the editing process, users can choose to save the Project and save the current Project status to the cloud. The term "save" mentioned later, unless otherwise specified, refers to saving to the cloud.

For changes that have not been saved to the cloud, the editor will temporarily store them in the user's browser. That is, if the user makes a change A and does not save it to the cloud, and then closes the editor. When opening the Project again using the editor, the change A will not be discarded, and the user can continue editing based on change A. This temporary storage may become invalid, and the reasons for invalidation include but are not limited to:

* Too long interval
* Insufficient local storage space
* Switching user identity or editing other Projects in the middle

The saved Project can be public or private, please refer to `Project.IsPublic` for details.

### Editing Existing Projects

Users can view all their saved Projects and edit them again, that is, restore the saved state in the current editor.

The editing actions for existing Projects are similar to editing after creating a new Project, and will not be repeated here.

When saving, the changes made this time should be appended to the existing Project in the cloud, and no new Project will be created in the cloud.

### Editing Based on Public Projects of Others

See "Remix" in the [Community](./community.md) section for more details.

### Importing and Exporting Projects

Users can export the Game in a Project as a file and save it locally through the editor. Note that information other than the Game in the Project will not be included in the exported file.

When a user is editing a Project, the user can also choose to import a file in the editor, which should be obtained by the user or others through the "export" function of the editor before. The imported file will restore the Game information to the currently edited Project. Therefore, for the currently edited Project, its Game information will be completely replaced, while other information will be retained. If we perform a save operation, it will be saved to the originally edited Project, and no new Project will be created.

If the user performs an import action without editing an existing Project, we should first create a new Project in the editor, and then perform the process of "restoring Game information" mentioned above.

### Saving Assets

When editing a Project, users can choose to save a certain Asset in the current Project to the asset library. When saving, users have the opportunity to specify DisplayName, Category, IsPublic, and other information.

Similar to Projects, public Assets can be seen and read by others.

### Using Saved Assets

Users can view and filter all public Assets saved by others, add them to the current Project, and continue editing.

Similar to Projects, when users add public Assets of others to a Project and make subsequent edits, they will not modify the original Assets saved by others. When users add their own Assets to a Project and make subsequent edits, they will not modify the original Assets saved by themselves either.

If they save the modified result to the asset library, it will create a new Asset in the cloud.

Therefore, the Assets in the asset library will not be modified, only created or deleted.

### Editing in Unauthenticated State

Editing by unauthenticated users through the editor is not supported for now. Before attempting any Project operations using the editor, users should log in first.

### Editing in Offline State

In the offline state, part of the editor is available, and the specific behavior details include:

* If the user is currently editing a Project (this Project may have been added to the cloud or may not have been added yet), the user can continue editing.
* Users cannot save the Project (to the cloud) when in offline state.
* Changes in the offline state will also be temporarily stored in the user's browser, and the logic is consistent with the temporary storage logic in the online state.
* Users cannot view their own or public Project lists, so they cannot select and continue editing from them.
* Users cannot view their own or public Asset lists, so they cannot select and import Projects from them.
* About user identity
	- If not logged in before, users cannot log in while in offline state.
	- If logged in before and the login status has not expired, continue to use the identity corresponding to that login status.

### Importing Assets from Scratch Projects

Users can choose to import a Scratch project file (obtained from the export function of the Scratch editor) in the XBuilder editor. The XBuilder editor will parse and list all the Assets in it, and users can choose and import them into the current Project.

The subsequent editing of Assets is the same as normal editing and will not be repeated here.

### Sharing Projects

See [Community](./community.md) for more details.

### Embedding in Third-Party Websites

TODO

