# Asset Generation

We provide users with high-quality assets through AIGC technology, addressing the lack of assets that users encounter during the creative process.

A key difference from conventional asset generation platforms is that our output is not "generic assets" like images or audio, but [Assets](./index.md#asset) on the XBuilder platform. This requires us to solve common problems such as character consistency and style uniformity on behalf of users, while also allowing us to expose fewer basic capabilities and instead provide more user-friendly features that better fit the XBuilder workflow.

For example:

* We prefer to generate and maintain Game Characters with Costumes and Animations, rather than requiring users to generate images separately for each sprite
* We prefer to generate Animations with Sound, rather than splitting animation frames and voiceovers into different workflows
* We prefer to leverage Project context information as much as possible when generating assets; for example, when generating a Backdrop for a Pixel Art style game, it should follow that style by default

## Features

We plan to provide the following types of AI asset generation features (in order of priority):

* Sprite, Animation, Costume generation
* Backdrop generation
* Sound generation
* Map (including tilemap) generation

### Sprite Generation

Generate complete Sprites (without code) based on an existing Project, which can be subdivided into:

* Character Sprite - based on Animation & Costume generation capabilities
* Prop Sprite
* Others

### Costume Generation

Generate new Costumes for an existing Sprite.

### Animation Generation

Generate new Animations for an existing Sprite.

### Backdrop Generation

Generate new Backdrops for an existing Project.

### Sound Generation

Subdivided into:

* Text-to-Speech
* Sound Effect
* Background Music

### Map (including tilemap) Generation

Low priority. The prerequisite is that XBuilder exposes the Map concept to users.

## Concept Definitions

The concepts involved are:

* Perspective
* Art Style
* Project Setting
* Asset Setting
* Asset Generation

### Perspective

Perspective describes the viewing angle of characters or objects in assets. Common perspectives include:

* Top-down
* Side-top-down
* Isometric
* Side-scrolling

Perspective not only affects the visual content of generated assets but may also affect the asset structure. For example, a Character Sprite with a side-top-down perspective may require more walking directions (such as 4 or 8), while a Character Sprite with a top-down or side-scrolling perspective only needs one direction.

### Art Style

Art Style describes the visual characteristics of assets. Common art styles include:

* Pixel Art
* Hand-drawn
* Low-poly
* Realistic

Within a Project, different assets usually follow the same or similar Art Style to ensure overall visual consistency and coherence.

### Project Setting

Project Setting describes the overall characteristics of the current Project, including but not limited to:

* Perspective
* Art Style
* (Game) genre, background description, etc.

We will provide an entry point and encourage users to set this information for their Projects. We can also automatically infer this information from project content as default values.

### Asset Setting

Asset Setting is a semantic description of an Asset. It can be the requirements when generating an Asset, and is also part of the resulting Asset's information.

Asset Setting roughly includes the following information:

* Type, such as Character Sprite, Prop Sprite, etc.
* Perspective, Art Style, etc.
* Others, such as the character's identity, age, gender, or detailed description of a prop's appearance

In principle, based on the same Asset Setting, we can generate nearly identical Assets multiple times. By adjusting the Asset Setting and regenerating, we can obtain Assets that inherit style or content while having some differences.

Child Assets (such as Costume, Animation, etc.) can inherit the parent Asset's Asset Setting to maintain consistency with other child Assets.

The closer two Assets' Asset Settings are, the more similar they should be in style and content. Therefore, we can compare Asset Settings to determine similarity between Assets, which helps decide whether to recommend a particular Asset to users or match during Public Asset Library searches.

For non-AI-generated Assets, we can also supplement them with an "inferred" Asset Setting, allowing them to participate in the recommendation and search processes mentioned above.

### Asset Generation

Asset Generation refers to the process of generating a corresponding Asset based on a given Asset Setting.

Because asset generation is usually a complex and time-consuming process, we need to manage Asset Generation, which may include the following information:

* Setting - the Asset Setting used to generate the Asset
* Status - the current state of generation, such as Pending, In Progress, Completed, Failed, etc.
* Result Asset - the Asset obtained after successful generation

Similar to the current usage of Copilot and AI Interaction, asset generation usage is limited. Different Settings may correspond to different quota consumption rules.

## Key Issues

### How to optimize user experience and balance costs given high cost and slow speed of asset generation

Prioritize searching existing assets to meet requirements, which is more efficient for users and avoids unnecessary generation costs.

Therefore, the general asset generation process is as follows:

1. User inputs requirements (including art style, perspective, text description, etc., some of which can be obtained from Project context)
2. Search Public Asset Library (match requirements with Asset Settings)
3. If the user is not satisfied with search results, proceed with asset generation
4. If the generated asset is approved (adopted or liked), automatically save it to Public Asset Library

Note that this means we need to blur the boundary between "searching for assets" and "generating assets" at the entry point.

### How to generate highly consistent Character Sprites with coherent animations

The specific process is as follows:

1. Generate Sprite Setting based on user input
2. Generate Default Costume based on Setting
3. Generate Animation Setting list based on Setting
4. Generate Animation for each Animation Setting:
	1. Generate first and last frames based on Animation Setting
	2. Generate (possibly voiced) animation video based on first and last frames using video generation model
	3. Construct Costume-group Animation & bound Sound based on video frames

## Technical Risks

### Unstable matching between generation results and inputs

Perspective, Animation descriptions, etc. may not always produce ideal results.

### High video generation costs

SOTA video generation models (such as Veo 3.1) cost around ¥1/second, with minimum resolution of 720p and minimum duration of 5 seconds. This is too costly for generating short animations in games.

Considerations:

* Research video generation models with lower resolution and shorter duration
* Combine multiple Animations into one video generation request
