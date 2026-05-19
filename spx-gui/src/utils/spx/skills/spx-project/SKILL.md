---
name: spx-project
description: Guidelines for developing spx projects (games), including file structure, code organization, and best practices. Use this skill when the task is specifically about building or modifying an spx game in XBuilder.
---

# About spx

spx is a Scratch-like 2D Game Engine for STEM education. It is designed for children to learn programming by developing games. spx is developed based on XGo classfiles. In spx, there are two types of classes: `Game` classes and `Sprite` classes.

The `Game` class is the "project class" that represents the whole game. In an spx project, there is only one code file (named `main.spx`) for the `Game` class. We call it code for "the stage". Variables & functions declared in the stage code can be accessed by all game objects.

The `Sprite` classes are "worker classes" which are used to define game objects. In an spx project, there can be multiple code files for `Sprite` classes. Each `Sprite` class has its own code file, named after the sprite's name, e.g., `Apple.spx`, `Banana.spx`. Variables & functions declared in a sprite's code can only be accessed by that sprite.

## Guidelines for Developing Games in spx

You MUST follow these IMPORTANT guidelines:

- **Code File Organization**: Always place in this order:

  1. Variable declarations (using `var` blocks)
  2. Function definitions
  3. Event handlers (like `onStart`, `onClick`)
  4. Optional top-level startup statements for simple initialization

- **Special API Notes**

  - For physics-related API calls (e.g., `setPhysicsMode`, `setVelocity`, `setGravity`), ensure the project's physics is enabled, otherwise these calls will have no effect.

- **Object-Oriented Implementation**: In spx, XGo uses classfiles instead of traditional struct-based OOP:

  - Each Sprite is a distinct object type
  - The Stage is a Game object
  - Variable blocks become fields of the object
  - Functions become methods of the object and please make sure to place the function definition before all event handlers (such as `onStart`, `onClick`)
  - Sprite can directly access the Game Field because the Sprite struct embeds the Game struct
  - In particular, the `clone` command creates a copy of the current Sprite struct. If you want to get the cloned object, you can get the object through `onCloned => {object := this}`

    Example: Stage File Structure

  ```spx
  var (
  	score int
  	speed int
  )

  var (
  	foo = 2
  	bar = 3
  )

  func reset() {
  	score = 0
  	speed = 20
  }
  ```

  Do not define it as:

  ```spx
  var (
  	foo = 2
  	bar = 3
  )

  var (
  	score int
  	speed int
  )

  func reset() {
  	score = 0
  	speed = 20
  }
  ```

  This compiles to:

  ```go
  type Game struct {
  	spx.Game
  	score int
  	speed int
  }

  var (
  	foo = 2
  	bar = 3
  )

  func (this *Game) reset() {
  	this.score = 0
  	this.speed = 20
  }
  ```

  Example: Sprite File Structure

  ```spx
  var (
  	dir int
  	x int
  	y int
  )

  func reset() {
  	dir = right
  	x = -100
  	y = 0
  }
  ```

  This compiles to:

  ```go
  type Snake struct {
  	spx.SpriteImpl
  	*Game
  	dir int
  	x int
  	y int
  }

  func (this *Snake) reset() {
  	this.dir = right
  	this.x = -100
  	this.y = 0
  }
  ```

- Put these declarations and event-listening statements at the top level of the code file:

  - File-scope variable / constant definitions
  - Event-listening statements, e.g., `onMsg "m", => { ... }`, `onKey KeyUp, => { ... }`

  For simple startup logic, you can also place sequential statements directly at the top level of the file. These top-level statements run in order, so code that appears later in the file has to wait for them. That is why a good default is to put this initialization logic near the end of the file, after the declarations and event-listening statements above, when that keeps the code easy to read.

  Use `onStart` when you want startup code to run without making later code wait, or when putting startup logic in a separate `onStart` block makes the code easier to read. This is especially useful for long waits, loops, or other startup work that should not hold up other event code.

  RIGHT:

  ```spx
  const word = "Hello"

  var (
  	count = 0
  )

  onClick => {
  	count++
  }

  println word
  ```

  ALSO RIGHT:

  ```spx
  onClick => {
  	say "Clicked"
  }

  onStart => {
  	wait 2
  	say "Ready"
  }
  ```

  WRONG:

  ```spx
  onStart => {
  	const word = "Hello"
  	var count int
  	println word

  	onClick => {
  		count++
  	}
  }
  ```

- Access a sprite instance by name via a pre-defined global variable.

  For example, if you have a sprite named `Player`, you can reference it directly from the stage or any other sprite:

  ```spx
  // You don't need to define the variable `Player` in your code, it's done by the engine
  println "Position of Player: " + Player.xpos + ", " + Player.ypos
  Player.step 100
  ```

- Use `broadcast`/`onMsg` to decouple interactions between sprites & stage.

  Though we can directly call methods on other sprites, using `broadcast` and `onMsg` promotes better separation of concerns and makes the code more maintainable. Here's an example:

  ```spx
  // Code of Sprite A
  onClick => {
  	broadcast "a-clicked"
  }

  // Code of Sprite B
  onMsg "a-clicked", => {
  	say "Sprite A was clicked"
  }
  ```

- Prefer higher-level APIs over low-level APIs

  There may be different APIs for similar purpose. For example, both `step` and `setXYpos` (or `changeXYpos`) can be used to change a sprite's position, while `step` provides higher-level abstraction as:

  - it respects the sprite's heading, which is more intuitive for character movement
  - if there is a bound animation to state "step", it will be played

  So `step` is preferred over `setXYpos` (or `changeXYpos`) in most cases. Use low-level APIs only when necessary.

  The same principle applies to other APIs, such as `turnTo` over `setHeading`, `turn` over `changeHeading`, etc.

## Some Concepts with their corresponding Chinese name

- Costume 造型
- Widget 控件
- Monitor 监视器

## APIs

In document `references/apis.md`, you can find definitions for built-in APIs of spx game engine.

## AI Interaction

AI Interaction is a feature in XBuilder that allows games to communicate with AI during runtime. This functionality enables users to create rich interactive scenarios in games such as intelligent opponents (like AI opponents in board games), smart conversations, dynamic content generation, and adaptive gaming experiences.

Read `references/ai-interaction.md` for more details and examples about how to use AI Interaction in spx games.
