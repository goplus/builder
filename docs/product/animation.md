# Animation

In Builder, we allow users to easily add and use animations to make game characters more realistic and lively.

The concepts of "animation" and "changes in business state" can be easily confused:

1. When a state change occurs, we often want to have a "transition animation" (to make the state change visually more natural).

	However, playing an animation does not necessarily mean that there is a change in business state. For example, when a character is standing still, we can make the character appear more lively by adding a breathing animation. Similarly, when a character is attacked, the animation of being hit does not necessarily correspond to a specific change in the character's state.

2. If we define states at a fine-grained level in the business layer and perform state changes quickly, we can simulate the effect of animation in the business layer.

	This is the approach used in the current Builder and similar products (such as Scratch) to implement animations (defining costumes and quickly switching costumes through code). However, this approach leads to a mixture of purely visual logic and business logic. Unless the fine-grained states themselves are of interest to the user in the business context, this approach can impose unnecessary burden on the user, which is something we want to avoid.

Therefore, when we talk about the concept of Animation here, we are referring to visual changes that are meaningful only in terms of visual effects, excluding common business logic. Taking the example of a character running, the visual changes corresponding to running can often be divided into two parts:

1. Position changes corresponding to running.
2. Posture changes during running.

Generally, 1 is the concern of the business logic, and the specific position information is suitable to be maintained by the user's business code. This information often affects the subsequent progress or outcome of the game. On the other hand, 2 is often not something that the business code would be interested in. Builder abstracts the logic of these visual changes into the concept of Animation, which reduces the cost for users to implement "lively running".

Complex visual changes usually occur with Sprites. Therefore, the concept of Animation here is only applicable to Sprites and not considered for the Stage (Backdrop).

## Basic Concepts

* Animation
* Costume-group Animation
* Skeletal Animation
* Sprite
* Animation Binding

### Animation

Animation is an abstraction of visual change logic that is not of concern to the business code. Based on the different implementation methods, it can be divided into two categories:

* Costume-group Animation
* Skeletal Animation

The basic information of an Animation includes:

* Name: A unique name within the Sprite it belongs to.
* Duration: The duration (in terms of playing once). Adjusting the duration does not trim the animation, but adjusts the playback speed (frame rate) of the animation.
* Sound: (Optional) Associated sound information that plays when the Animation starts. If the Animation loops, the Sound will play in the same cycle. The playback speed of the Sound is fixed and not affected by the Animation Duration.

### Costume-group Animation

Technically, it refers to frame-by-frame animation. In addition to the basic information of an Animation, a Costume-group Animation also includes the following information:

* Costumes: A list of costumes, where each costume corresponds to an animation frame. The frame rate (FPS) can be determined based on the number of costumes and the duration.

### Skeletal Animation

In addition to the basic information of an Animation, a Skeletal Animation also includes the following information:

* Frames: A list of frames.

### Sprite

Building upon the [XBuilder Product](./index.md), the Sprite is extended as follows:

* Model: Model information, including Skeleton, Mesh, etc. Not every Sprite has Model information. Only Sprites with Model information can have Skeletal Animations added.
* Animations: A list of Animations. A Sprite can contain zero or multiple Animations. The items in the list can be Costume-group Animations or Skeletal Animations.

Compared to Costumes, the Model provides a more structured way of defining the appearance of a Sprite, making it more friendly for action transfer and automatic animation generation. However, editing the Model can be more difficult, and it can be more challenging for users to obtain relevant materials.

Our overall strategy is to support Costumes (& Costume-group Animations) as the basic means of defining the appearance of a Sprite. Users can make full use of existing assets or obtain them from other sources. In addition, we support Model (& Skeletal Animation) as an advanced means of defining the appearance of a Sprite, thereby:

1. Providing richer and more powerful generation capabilities in Builder.
2. Achieving better visual effects in the game.

Therefore, we will provide the ability to automatically parse and generate Models based on Costumes when this capability becomes mature enough. All Sprites will default to having Model information and can have both Costume-group Animations and Skeletal Animations added simultaneously.

Before that, some Sprites (such as those created by selecting local image files) do not have Model information and therefore cannot have Skeletal Animations added. Whether a Sprite has Model information or not, most of its logic and operations are consistent. Users only need to pay attention to this difference in a few cases (such as when adding Animations), and Builder will provide different interactive interfaces to assist users in performing operations correctly.

### Animation Binding

In addition to calling `animate <name>` imperatively in Sprite code to play an animation, users can automatically play a specific Animation at the appropriate time by binding it to a specific state. Currently, the supported "specific states" for binding include:

* Walking: Automatically plays the bound animation when displacement is triggered by spx methods like `step`.
* Death: Automatically plays the bound animation when the Sprite dies, triggered by spx methods like `die`.
* Default: When an Animation is bound to the default state, if the Sprite is not in any other specific state and is not playing any other animation, the Animation will be played in a loop automatically.
* ~~Turning: Automatically plays the bound animation when the direction changes, triggered by spx methods like `turn`.~~
* ~~Sliding: Automatically plays the bound animation when displacement is triggered by spx methods like `glide`.~~

## User Story

### Adding a Sprite

Sprites can be obtained from the following sources:

1. Selecting an existing Sprite from the asset library. Sprites in the asset library may or may not have Model information.

2. Creating a Sprite based on a local image.

	Users can create a Sprite by selecting a local image and adding it to the current Project. The file selection supports multiple selections.

	We will provide the ability to preprocess files, which may include but is not limited to:

	* Splitting Sprite Sheets, GIFs, etc.
	* Background removal from images.

	Sprites created based on local images do not have Model information by default. Users can parse the images in existing Sprites (with user assistance if needed) and generate Model information using the capabilities provided by Builder. Details TBD.

3. Generating Model & default Costume based on user-provided semantic text (and other possible auxiliary information) to obtain a Sprite.

	Details TBD.

### Adding a Costume to a Sprite

Users can create a Costume by selecting a local image and adding it to the current Sprite. The logic (including file preprocessing, etc.) is the same as when adding a Costume to a Sprite created directly from a local image as described above.

### Adding a Costume-group Animation to a Sprite

For a Sprite, users can merge one or more Costumes by selecting them and adding them as a Costume-group Animation to the current Sprite. The Costumes merged into the Animation will no longer appear in the Sprite's Costume list.

When creating (or after creating) an Animation, users can specify its Name, Duration, Sound, and other information. They can also bind it to specific states.

### Adding a Skeletal Animation to a Sprite

Only Sprites with Model information can have Skeletal Animations added. For Sprites without Model information, we will guide users in an appropriate way based on the maturity of the capabilities to parse and generate Model information from existing Costumes (& Costume-group Animations) information, and then continue adding Skeletal Animations.

Skeletal Animations can come from the following sources:

* Binding common predefined actions to the current Sprite.
* Uploading or recording videos using a camera, with the system extracting actions based on the videos.

	Details TBD.

* Generating Animations based on user-provided semantic text (and other possible auxiliary information).

	Details TBD.

Similar to Costume-group Animations, when creating (or after creating) an Animation, users can adjust its Name, Duration, Sound, and other information. They can also bind it to specific states.

### Using (playing) Animations in the game

In the game, playing Costume-group Animations or Skeletal Animations is done in the same way, using two methods:

1. Playing a specific Animation by code (`animate <name>`).
2. Binding an Animation to a specific state - when the specific state is triggered, the specified Animation will be played automatically.

