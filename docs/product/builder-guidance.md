# Buider guidance

The Builder Guide is designed to help new users with zero programming background quickly get started with the Builder product and the Go+ language. It does so by designing an interesting, fully functional game project with a narrative storyline and employing various interactive and guided walkthroughs. After completing the guide, users will have a mini-game that they can freely modify and share with the community.

The guide serves as an introductory course that teaches the basics of Go+ syntax and helps users quickly get started with Go+Builder. In fact, the design of the guide is highly extensible, so that various project-based and task-based courses can adopt this design in the future. In other words, multiple storylines can be introduced later to enrich the Builder course system. We will also develop an efficiency tool for creating Builder courses to help course designers craft high-quality lessons.

Go+Builder uses text-based programming to develop games, which is quite different from block-based programming. Throughout the guide, the vast majority of tasks require users to write Go+ code. At the same time, to reduce the cognitive burden for users with no programming background, the Builder Guide primarily uses a combination of video watching and fill-in-the-blank code exercises as the guiding method. Additionally, there will be UI guidance to help users get started with the Builder IDE.

## Basic Concepts

### Storyline

The Builder Guide introduces the concept of a storyline. A narrative (e.g., “Niuxiao Qi Rescues the Princess”) serves as the main thread that runs through the entire guide. Upon completing the guide, the user will obtain a mini-game that incorporates this storyline.

The entire storyline is divided into multiple levels, which are displayed as a level list in the UI and presented in a map format (castle, the route map of the brave Niuxiao Qi, etc.):

- There is a strict order between levels; the next level can only be unlocked after completing the previous one.
- Completing specified levels earns corresponding achievements: these achievements are not global but only within the scope of the guide, though they are still bound to the user (for example, “Guardian Niuxiao Qi”, “Hero Niuxiao Qi”, “Dragon Slayer Niuxiao Qi”, etc.).
- Completing specified levels grants exclusive assets (in conjunction with the asset library): During the guide, users will be required to add various assets (sprite assets, sound assets, scene assets, etc.). The high-quality assets needed will be provided by us. Once a user completes a level, the assets used in that level will be given to the user for free, and the user can later use them in their own asset library and add them to their Builder projects.
- On the map, each level should have the following information:
  - **title:** The title of the level.
  - **image:** The cover image of the level.

### Levels

A level is a concrete manifestation of the storyline—a standalone operational task within the narrative. There is a strict logical order between levels to ensure the continuity of the storyline and the gradual, step-by-step progression of programming knowledge from simple to complex.

Each level comes with a pre-set initial snapshot (essentially a Builder project stored as a lightweight JSON). When a user clicks to enter a level, the Builder project opened is a copy of this snapshot (not a reference). All operations in that level (writing code and adding assets) are changes made to this copy. If a user re-enters a level that was either completed or partially completed, they will still be provided a copy of the initial snapshot rather than the snapshot from their last exit.

A level begins with an introduction that explains the tasks to be completed in the level and presents the expected outcome (which could be in the form of a video, an image, or just text). Then the user proceeds to complete each node task in sequence by watching a video and following the steps:

- A level consists of multiple node tasks, each with a strict order; the user must complete one node task before moving on to the next.
- Each node task includes a video; the user can only proceed to the steps after watching the video.
- Each node task contains one or more steps. Once the user completes all the steps in a node task, the node task is considered complete. When all node tasks are completed, the level is cleared, and the next level is unlocked.

During the video, the user is not allowed to drag (seek) but may pause it. Also, while the video is playing, the user is prevented from making any changes to the current Builder project. Only when the user enters the step phase are they allowed to make changes within the designated area of the Builder project. Users also have the option to skip the current video and proceed directly to the first step.

A level only provides the specific spx API required for that level:

- **Considerations for this approach:**
  - Simplifies implementation by eliminating the need for UI highlights to guide the user to click on the API.
  - Opens both the spx API area and the code editing area to the user, making the operations closer to real-world development.
  - Provides only what is needed, reducing the cognitive burden of searching for the appropriate API.
  - In the coding steps, the specific API to be used will be clearly indicated in the step’s content.

### Steps

Steps are the smallest units of user operations. They are divided into Coding steps and Guided steps (with room to expand to other types later).

#### Coding Steps

These steps open up the code editing area and the spx API area for the user to write code. The location of the code editing area must be highlighted (with other areas masked to prevent user interaction). To minimize the difficulty for users to get started, a fill-in-the-blank approach is used.

**Fill-in-the-blank:**  
For a Coding step, an initial snapshot is stored in which parts of the code are left blank (template code) for the user to complete. At the start of the step, Builder reloads this snapshot, and the user completes the code based on the provided template. Once the code passes the verification, the step is considered complete. Coding steps offer the following interactive options:

- **Code Check:** The Coding step also stores an end snapshot. When the user clicks the code check button, the current snapshot is compared with the step’s end snapshot. If they match, the step passes.
- **View Answer:** Allows the user to see the solution code along with an explanation.

#### Guided Steps

Guided steps primarily use UI guidance to help users perform operations step by step.

**Possible scenarios for guided steps include:**

- Guiding the user to switch to the code editor for a specified sprite or stage.
- Guiding the user to operate on the stage (adding backgrounds, controls, etc.).
- Guiding the user to add sounds.
- Guiding the user to add sprites.
- Guiding the user through graphical operations on a sprite.
- Guiding the user to add sprite animations (frame-based or skeletal animations).
- Guiding the user to run the project.

UI guidance employs various methods to help users complete guided operations:

- UI highlighting
- Arrow pointers
- Text and image presentations
- Sprite asset images
- Mask overlays (to restrict user operations)

The granularity of guided steps: For an operation such as adding a sprite, it should be divided into at least four guided steps:

- Guiding the user to click the “add sprite” button (the “+” sign).
- Guiding the user to click “select from asset library.”
- Guiding the user to choose a specified sprite asset.
- Guiding the user to click the confirm button.

Based on this granularity, it can be seen that some guided steps will change the state of the Builder project while others will not. For those that change the state of the Builder project, a snapshot of the state after the change must be stored to verify whether the user can pass the step, i.e., an end snapshot is required for comparison.

#### Snapshot Comparison

After the user completes the fill-in-the-blank coding step by clicking “Check Code” or after making changes in a guided step that alter the Builder project state, a snapshot comparison is triggered to verify whether the step is passed. There are several ways to implement this snapshot comparison:

- Comparing all or part of the snapshot’s content as a string.
- Using regular expressions to compare all or part of the snapshot’s content.
- Leveraging a large model to perform the comparison.

#### Basic Structure of Step Information

1. **title:** Step name.
2. **index:** Step order.
3. **description:** Description of the step.
4. **tip:** Interactive prompt (triggered under certain conditions).
5. **duration:** The time duration the user stays stuck on the current step before a prompt is triggered (for example, 5 seconds).
6. **feedback:** Feedback provided to the user after the step’s verification.
7. **target:** The target element’s id or class string used to locate the target element for this guided step. The target element is highlighted while other parts are masked to prevent interaction.
8. **content:** The descriptive content of the step.
9. **placement:** The position where the step’s prompt box is placed relative to the target element (options: “left”, “top”, “right”, “bottom”).
10. **type:** The type of step (Coding step or Guided step).
11. **isCheck:** Whether the step involves snapshot comparison.
12. **startSnapshot:** The initial snapshot of the step (all steps have this, and it is loaded every time the user enters a step in the Builder project).
    - **Potential issue:** Loading the snapshot might conflict with IDE information.
13. **endSnapshot:** The end snapshot of the step (only available if **isCheck** is true).

#### Specific Information Structure for Coding Steps

1. **path:** The path of the coding file, used to describe the location of the coding file in the current snapshot. For example, if coding is required in Sprite A, the path would be “sprite/A”.
2. **tokenMask:** The content of the blank (fill-in-the-blank) area.
   - **tokenStartPos:** The starting position of the blank.
   - **tokenEndPos:** The ending position of the blank.