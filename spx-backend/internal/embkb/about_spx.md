# About spx

spx is a Scratch-like 2D Game Engine for STEM education. It is designed for children to learn programming by developing games. spx is developed based on XGo classfiles. In spx, there are two types of classes: `Game` classes and `Sprite` classes.

The `Game` class is the "project class" that represents the whole game. In an spx project, there is only one code file (named `main.spx`) for the `Game` class. We call it code for "the stage". Variables & functions declared in the stage code can be accessed by all game objects.

The `Sprite` classes are "worker classes" which are used to define game objects. In an spx project, there can be multiple code files for `Sprite` classes. Each `Sprite` class has its own code file, named after the sprite's name, e.g., `Apple.spx`, `Banana.spx`. Variables & functions declared in a sprite's code can only be accessed by that sprite.

In document `spx-apis.md`, you can find definitions for most APIs of spx game engine.

## Guidelines for Developing Games in spx

You MUST follow these IMPORTANT guidelines:

* **Code File Organization**: Always place in this order:
  1. Variable declarations (using `var` blocks)
  2. Function definitions
  3. Event handlers (like `onStart`, `onClick`)

* **Object-Oriented Implementation**: In spx, XGo uses classfiles instead of traditional struct-based OOP:
  - Each Sprite is a distinct object type
  - The Stage is a Game object
  - Variable blocks become fields of the object
  - Functions become methods of the object and please make sure to place the function definition before all event handlers (such as `onStart`, `onClick`)
  - Sprite can directly access the Game Field because the Sprite struct embeds the Game struct
  - The first `var` block cannot assign values since it is compiled into struct fields, but you can define variables in first `var` block and with assign values in `onStart` event handler.
  - In particular, the clone command Make a clone of current sprite is actually copy current Sprite struct. If you want to get the cloned object, you can get the object through `onCloned => {object := this}`

    Example: Stage File Structure

	```spx
	var (
		score int
		speed int
	)

	var (
		fo0 = 2
		bar = 3
	)

	func reset() {
		score = 0
		speed = 20
	}
	```

	can not define to:

	```spx
	var (
		fo0 = 2
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

	``` go
	type Game struct {
		spx.Game
		Score int
		Speed int
	}

	var (
		fo0 = 2
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

	``` go
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

* Put these statements at the top level of the code file:

	- File-scope variable / constant definitions
	- Event-listening statements, e.g., `onMsg "m", => { ... }`, `onKey KeyUp, => { ... }`

	Put other initialization logic in the callback of `onStart`.

	RIGHT:

	```spx
	const word = "Hello"

	var (
		count int
	)

	onStart => {
		println word
	}

	onClick => {
		count++
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

* Access a sprite instance by name via a pre-defined global variable.

	For example, if you have a sprite named `Player`, you can reference it directly from the stage or any other sprite:

	```spx
	onStart => {
		// You don't need to define the variable `Player` in your code, it's done by the engine
		println "Position of Player: " + Player.xpos + ", " + Player.ypos
		Player.step 100
	}
	```

* Use `broadcast`/`onMsg` to decouple interactions between sprites & stage.

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

* Prefer higher-level APIs over low-level APIs

	There may be different APIs for similar purpose. For example, both `step` and `setXYPos` (or `changeXYPos`) can be used to change a sprite's position, while `step` provides higher-level abstraction as:

	- it respects the sprite's heading, which is more intuitiven for character movement
	- if there is a bound animation to state "step", it will be played

	So `step` is preferred over `setXYPos` (or `changeXYPos`) in most cases. Use low-level APIs only when necessary.

	The same principle applies to other APIs include `turnTo` over `setHeading`, `turn` over `changeHeading`, etc.

## Some Concepts with their corresponding Chinese name

* Costume 造型
* Widget 控件
* Monitor 监视器
