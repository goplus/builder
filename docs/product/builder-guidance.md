# Builder Wizard

The Builder Wizard is designed to introduce new users with no programming background to the Builder product and the Go+ language by guiding them through the creation of a fun, fully functional, and story-driven game project. Using various interactive and step-by-step guidance methods, users will be able to quickly get started. Upon completing the wizard, users will have a mini-game that they can further customize and publish to the community.

The wizard serves as an entry-level course, teaching basic Go+ syntax and how to use Go+ Builder effectively. The design of the wizard is highly extensible, meaning that future project-based and task-based courses can adopt this structure. Additional storylines can be introduced to enrich the Builder course system. Furthermore, we plan to develop an efficiency tool to assist course designers in creating high-quality courses for Builder.

Go+ Builder enables game development through text-based programming, which differs significantly from block-based programming. Throughout the wizard, most tasks require users to write Go+ code. To reduce the cognitive burden on beginners, the Builder Wizard primarily utilizes video tutorials and fill-in-the-blank coding exercises as guidance. Additionally, UI tutorials will help users get familiar with the Builder IDE.

## Basic Concepts

### Storyline

The Builder Wizard introduces a storyline concept, using a narrative (e.g., "Niu Xiaoqi Rescues the Princess") as the main thread throughout the wizard. Upon completion, users will have created a mini-game with an engaging storyline.

The storyline is divided into multiple levels, displayed as a level list on the UI using a map format (e.g., a castle, a warrior's path, etc.):

- Levels have a strict sequential order; completing a level unlocks the next one.
- Completing specific levels grants corresponding achievements. These achievements are specific to the wizard but remain tied to the user, such as "Flower Guardian Niu Xiaoqi," "Hero Niu Xiaoqi," and "Dragon Slayer Niu Xiaoqi."
- Completing specific levels grants exclusive assets (linked with the asset library). During the wizard, users will add various assets (e.g., sprites, sounds, scenes). High-quality assets required for the game are provided and unlocked upon level completion, allowing users to use them in their own Builder projects.
- A level in the map should contain the following information:
  - **title**: Level title
  - **image**: Level cover image

A new project (let's call it Project A) is created when the user starts the first level of a storyline for the first time. Each storyline corresponds to a separate Project A, with its name and description constructed from the storyline's information. Users will always work within Project A when accessing levels of the same storyline.

A new project (Project B) is created when the user completes the final level of the storyline. Project B contains the full game from the storyline, allowing users to modify and expand it. A storyline corresponds to one Project B, and users can replay the final level multiple times, but Project B is only created on the first completion.

Project A is stored in the cloud but is not shown in the user's project list. However, Project B is a normal project displayed in the user's list. This distinction requires additional metadata to mark whether a project is "normal" (visible in the user's project list) or "special" (hidden from the list).

## Levels

Levels represent the concrete implementation of the storyline, acting as independent operational tasks. They have a strict sequential logic to maintain the storyline's coherence and ensure a progressive learning curve in programming concepts.

When users enter a level, their corresponding Project A is opened (created upon entering the first level). All operations, such as writing code and adding assets, are automatically saved to Project A in the cloud. A pop-up will introduce the level, listing the tasks to be completed. After clicking "Start," users proceed step-by-step through the tasks by watching tutorial videos and completing steps:

- A level consists of multiple task nodes in a strict sequential order; users must complete each node before progressing.
- Each task node includes a video that must be watched before proceeding to the next step.
- Each task node has one or more steps; completing all steps within a node marks it as complete. Completing all nodes unlocks the next level.

Users cannot fast-forward videos but can pause them. While watching a video, users are restricted from modifying their Builder project. Modifications are only allowed when users reach the corresponding steps. Users may also skip videos to proceed directly to the first step.

Each level only provides the necessary spx API for that specific level:

- **Reasons for this approach:**
  - Simplifies implementation by removing UI-based API selection guidance.
  - Keeps the entire spx API area and code editor open to the user for a more realistic development experience.
  - Reduces cognitive load by only showing relevant APIs.
  - The required APIs are explicitly specified within each coding step.

## Steps

Steps are the smallest unit of user operations and are categorized into **Coding Steps** and **Guided Steps** (other types can be introduced in the future).

### Coding Steps

Users write code in the editor with access to the relevant spx API area. The editor highlights the target code area while other areas are blocked. To ease the learning curve, a "fill-in-the-blank" approach is used.

Fill-in-the-blank coding requires storing both an **initial snapshot** and a **final snapshot** of the step:

- The final snapshot contains the correct code the user needs to add.
- The initial snapshot has placeholders where the correct code is missing.

At the start of the step, the Builder reloads the initial snapshot, replacing the editor content. Users complete the missing code, and upon passing validation, they complete the step.

**Coding Step Interactions:**

- **Code Validation**: Compares the current editor snapshot with the final snapshot (using formatted string comparison). If the comparison fails, the backend AI model is used for validation.
- **View Answer**: Displays the correct answer.

### Guided Steps

Guided steps use UI-based assistance to help users complete actions.

**Use Cases for Guided Steps:**

- Switching to the code editor for a specific sprite or stage.
- Modifying the stage (adding backgrounds, controls).
- Adding sound effects.
- Adding sprites.
- Editing sprite properties.
- Creating sprite animations (costume-based and skeletal animations).
- Running the project.

Guided steps utilize various techniques to assist users:

- UI highlights
- Arrows for direction
- Text and images
- Sprite images
- Overlays (restricting user actions)

**Granularity of Guided Steps:**

For example, adding a sprite should be broken down into four steps:

1. Click the **Add Sprite** button (+ icon).
2. Click **Choose from Asset Library**.
3. Click the specific sprite asset.
4. Click the **Confirm** button.

Some guided steps alter the Builder project state, while others do not. Steps that change the project state require a final snapshot for validation.

### Snapshot Comparison

After the user completes the code fill-in-the-blank in the coding step and clicks "Check Code," or after completing the follow-along step that changes the Builder project state, a snapshot comparison needs to be triggered to check if the user can pass the step. There are multiple ways to implement snapshot comparison:

- Perform a string comparison on all or part of the snapshot.
- Perform a regex comparison on all or part of the snapshot.
- Use a large model to complete the comparison.

### Basic Step Information Structure

1. **title**: Step name  
2. **index**: Step order  
3. **description**: Step description  
4. **tip**: Interactive hint (triggered by conditions)  
5. **duration**: The time delay before the tip appears if the user is stuck on the step, e.g., 5 seconds  
6. **feedback**: Feedback information after the user completes the check  
7. **target**: The ID or class string of the target element, used to highlight the target element while masking other areas to prevent user operations  
8. **content**: Description content of the step  
9. **placement**: Position of the step tooltip relative to the target element [“left”, “top”, “right”, “bottom”]  
10. **type**: Step type (Coding step, Follow-along step)  
11. **isCheck**: Whether the step involves snapshot comparison  
12. **startSnapshot**: Initial snapshot of the step (present in all steps; when a step is entered, the Builder project loads this snapshot by default)  
    - **Potential Issue**: Loading snapshots might conflict with IDE information  
13. **endSnapshot**: Final snapshot of the step (only available when `isCheck` is `true`)  

### Unique Information Structure for Coding Steps

1. **path**: Path of the code file, describing the file’s location in the current snapshot. For example, if coding needs to be done in *Sprite A*, the path would be `"sprite/A"`.  
2. **tokenMask**: Content of the fill-in-the-blank placeholders  
   - **tokenStartPos**: Start position of the blank  
   - **tokenEndPos**: End position of the blank  
