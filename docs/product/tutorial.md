# User Tutorial

There are two needs that must be satisfied:

1. Builder itself, as an IDE, has a certain learning curve, requiring help for users to learn how to use Builder's features; this is typically manifested as a User Manual or Product Tour
2. (Game-based) programming education; this is typically manifested as a specially designed course system

The goal of User Tutorial is to satisfy need 1, and to a limited extent satisfy need 2. For example, User Tutorial will not consider implementing complex features like creator systems, user incentives, paid courses, etc.

Considering need 1, a good Product Tour requires:

* Personalization
* Interactivity
* User action triggers

Considering need 2, good programming education courses need:

* Richness
* Step-by-step guidance
* Low creation cost

We choose to enhance the robot assistant (Copilot) capabilities and create courses around these capabilities, having it guide users through learning.

## Basic Concepts

### Assistant Copilot

Based on the Copilot introduced in [Code Editor](./code-editor.md), we adjust its positioning to: a robot assistant that helps users use Builder, where users can interact with Copilot to get help information.

It manifests as a dialog box floating above other elements, where users can input questions or instructions, and Copilot will provide corresponding hints or operation suggestions based on user input and the current Builder state.

Correspondingly, Copilot will gain the following capabilities:

* Can perceive Builder's interface state and understand the functions of different UI elements
* Affect Builder's interface through special reply content, such as highlighting specific UI elements and displaying hints
* Perceive events occurring in Builder and actively engage in conversation

	- The prerequisite is that the current user intent is clear, such as when the user is in a Tutorial Course
	- Events may include: user completing an operation, game exit, etc.
	- Perceiving "general user operations" is challenging to implement; we may degrade to user-triggered actions in early implementation, such as providing a fixed "Continue" button in the dialog box for users to click

The Copilot dialog box is hidden by default and displayed when a Session exists.

### Assistant Session Copilot Session

A Copilot Session corresponds to a batch of interactions between Copilot and the user.

Each Copilot Session includes independent:

* Subject: Theme; it affects the information and events that Copilot focuses on and the capabilities it can invoke

	For example, a Session initiated through Tutorial will include corresponding Course information in its Subject.

* Messages: Conversation history in this session

When using Copilot, users will only have one active Session at a time.

Sessions can be created, such as:

* User invokes Copilot through a persistent entry point
* Builder automatically invokes Copilot in specific scenarios (such as when user enters a Tutorial Course)

Sessions can be ended, such as:

* User closes the session through a close button
* Builder automatically ends the session in specific scenarios (such as when user completes a Tutorial Course)
* A new Session is created

### Course

Course is the core concept of User Tutorial. It is educational content containing a series of steps, aimed at guiding users to complete specific learning objectives.

Depending on the learning objective, a Course's complexity can be low or high. "Adding an Animation to a Sprite" or "Creating a Flappy Bird game" can both be a Course. Generally, we encourage designing a Course as a small learning unit that users can complete in a short time.

Course has two relationships with User:

1. Course is created by a User, where Course and User have a many-to-one relationship
2. Course can be learned by other Users, where Course and User have a many-to-many relationship

Additionally, Course contains the following information:

* Title: A simple description of the Course
* Thumbnail: Thumbnail image
* Url: Initial URL, Builder will automatically jump to this URL when user enters the Course
* References: Reference information, Course may reference other content (such as Projects) as references
* Prompt: Hint information, Course creators can write prompt information to explain the Course design and objectives to Copilot

### Course Gallery

Course Gallery is a list maintained by Builder officials, listing recommended Courses for ordinary users to browse and learn.

### Course Admin

Course Admin is a special type of User. They can:

* Add and manage Courses they create (this permission may be opened to more users later)
* Manage Course Gallery

### Effect-free Mode Editor

We extend the editor's capabilities, allowing users to open Projects that don't belong to them through the editor and continue editing Project content. This editor state is called Effect-free Mode.

In Effect-free Mode:

* Edited content will not be saved to the cloud
* Users cannot publish projects
* Users can save the current state as a new project (belonging to the user themselves)

Effect-free Mode may be used in scenarios such as:

* In User Tutorial, users can open corresponding Projects in Effect-free Mode to learn code writing, resource operations, etc.
* On Project pages, users can directly open others' public Projects in Effect-free Mode, allowing users to view implementation details of public Projects at lower cost without having to Remix first.

### Game Exit

Game exit refers to the end of game execution, generally corresponding to an `exit` call in game code.

When the exit code is 0, it indicates normal game exit; when the exit code is non-zero, it indicates abnormal game exit. We recommend designing programming Courses so that after users complete the tasks required by the Course, the game automatically exits normally. This allows Builder to perceive that users have completed the programming task.

## User Stories

### User Learning "Create Project"

* User enters Course "Create Project", correspondingly:

	- Builder jumps to the Course's initial URL, such as `/` (homepage)
	- Builder creates a new Copilot Session based on Course information and gives a hint:

		> To create a new Project, please open the "Project dropdown menu" in the navigation bar and click the "New Project" menu item

		If the user clicks on "Project dropdown menu", Copilot will highlight the corresponding UI element in the navigation bar and display hint information below it: "Mouse over".

* With Copilot's help, the user clicks the "New Project" button, opening the corresponding modal

* Copilot continues to prompt the user

	> Enter the desired Project name in the "Project name input box", then click the "Create" button

	If the user clicks on "Project name input box", Copilot will highlight the input box and display hint information below it: "Enter here"; if the user clicks the "Create" button, Copilot will highlight the button and display hint information below it: "Click here to submit".

* After the user completes input and clicks the "Create" button, Builder jumps to the newly created Project page, and Copilot continues to prompt the user

	> Congratulations! Project created successfully. You can continue learning the next course: "Move Sprite", or return to "Course List".

	If the user clicks "Move Sprite", Builder will enter the corresponding Course. If the user clicks "Course List", Builder will open the Course Gallery page.

	The Copilot Session corresponding to this Course ends.

### Creating Course "Create Project"

* Choose `/` (homepage) as the Course initial URL
* Write Prompt, such as

	```
	### Goal

	Guide users to create a new Project, helping users learn Builder's basic operations and understand the concept of Project in this process.

	### Steps

	1. Find the "New Project" entry point
	2. Complete creating a new Project according to interface prompts
	```

* Save and test
* After testing is complete, add it to Course Gallery

### User Learning Programming Loop Concept

* User enters Course "Loop", correspondingly:

	- Builder jumps to the Course's initial URL, such as `/editor/<course_author>/loop` (opening Project `loop` in Effect-free Mode)
	- Builder creates a new Copilot Session based on Course information and gives a hint:

		> In this course, you will learn the concept of loops in programming. In the current Project, we have designed a task that you need to complete using loops.
		> First, make sure you have selected "Sprite A", and the following tasks will be completed by modifying Sprite A's code.

		If the user clicks "Sprite A", Copilot will highlight the UI element corresponding to A in the Sprite panel in the bottom right corner and display hint information below it: "Click to select Sprite A".

* With Copilot's help, the user selects "Sprite A", and Copilot continues to prompt the user

	> Now, you can see Sprite A's code in the "Code Editor". You can see that Sprite A will move forward 10 steps after the game starts. Next, we need to make it repeat this action 5 times.
	> We can achieve this functionality through "repeat statement". After modifying the code, you can test it through the "Run" button.

	If the user clicks "Code Editor", Copilot will highlight the code editor and display hint information below it: "Edit code here"; if the user clicks "repeat statement", Copilot will highlight the corresponding UI element in the API Reference (scrolling as needed to bring it into view) and display hint information below it: "Click or drag to insert it into the code". If the user clicks the "Run" button, Copilot will highlight the run button and display hint information below it: "Click here to run and test the code".

* User modifies code under Copilot's guidance

	During this process, they can always describe problems they encounter in the Copilot dialog box and get suggestions.
	
	They can also add questions to the current Copilot Session through other Copilot feature entry points (such as the "Fix Problem" button corresponding to Diagnostics in Code Editor) and get replies.

* After the user completes code modification and runs successfully as required (game exits normally), Copilot continues to prompt the user

	> Congratulations! You have successfully used loops to complete the task. Now you can continue learning the next course: "Conditional Judgment", or return to "Course List".

	If the user clicks "Conditional Judgment", Builder will enter the corresponding Course; if the user clicks "Course List", Builder will open the Course Gallery page.

	The Copilot Session corresponding to this Course ends.

### Creating Course "Loop"

* Create a Project named `loop` under your own account, add Sprite A and write code, including

	- Add an `onStart` event handler in Sprite A's code, execute `step 10` in the callback, leaving it for users to further modify
	- In stage code, continuously check if Sprite A has moved to a position 50 steps away, if so, exit the game through `exit 0`

* After publishing Project `loop`, use `/editor/<course_author>/loop` as the Course's initial URL
* Based on `loop`, create a new Project `loop-solution`, modify its code to include the correct answer and publish it, add the Project to the Course's References
* Write Prompt, such as

	```
	### Goal

	Guide users to use loops to complete tasks, helping users learn to use `repeat` statements to implement loops in this process.
	
	In this task, we require users to use code to control Sprite A to repeat the operation "move forward 10 steps" 5 times after the game starts, ultimately achieving the effect of Sprite A moving 50 steps.

	### Steps

	1. Ensure the user has selected Sprite A and is viewing its code in the code editor
	2. Modify Sprite A's code so that it repeatedly moves forward 10 steps after the game starts, with 5 repetitions
	3. Test whether the code runs correctly (game exits normally)

	### Other

	* We only want users to modify Sprite A's code, not the stage code
	* If users use other methods (such as `for` statements) to implement loops, we will also consider it a correct answer and tell them they can simplify the code through `repeat` statements
	* Please refer to project `loop-solution` to understand the correct answer
	```

* Save and test
* After testing is complete, add it to Course Gallery

### User Browsing Course Gallery

Users can browse our recommended Courses in Course Gallery:

* Courses are organized into different categories, users can filter Courses by category
* Users can see each Course's Title, Thumbnail and other information
* Users can start learning a Course by clicking the corresponding item in the list

### Managing Course Gallery

Course Gallery is managed by Course Admin, who can:

* Add new Courses to Gallery
* Delete inappropriate Courses
* Adjust Course categories and sorting

### Managing Self-Created Courses

Course Admin can manage Courses they create, including:

* Modify Course's Title, Thumbnail, Prompt, References and other information
* Delete Courses
