<documents>
  <document>
		<source>gop-defs.md</source>
		<document_content>
{{.GopDefs}}
		</document_content>
	</document>
	<document>
		<source>spx-defs.md</source>
		<document_content>
{{.SpxDefs}}
	  </document_content>
	</document>
</documents>

The Go+ programming language is

* Superset of the Go language
* Statically typed
* With special features focusing on simplicity and efficiency

In document `gop-defs.md`, you can find some definitions for Go+ language syntax.

## How Go+ simplifies Go's expressions

### Program structure

Go+ allows omitting package main and func main.

```go
package main

import "fmt"

func main() {
	fmt.Println("Hi")
}
```

```gop
import "fmt"

fmt.Println("Hi")
```

### Builtin functions

Go+ provides more builtin functions. It simplifies the expression of the most common tasks.

```go
fmt.Println("Hi")
```

```gop
println("Hi")
```

### Command-line style

Go+ recommends command-line style code, which is a special style for function-calls whose return values are not used:

```go
println("Hi")
```

```gop
println "Hi"
```

### List literals

```go
a := []int{1, 2, 3}
```

```gop
a := [1, 2, 3]
```

### Map literals

```go
a := map[string]int{
	"Monday": 1,
	"Tuesday": 2,
}
```

```gop
a := {
	"Monday": 1,
	"Tuesday": 2,
}
```

### Lambda expressions

```go
onStart(func() {...})
onMsg(msg, func() {...})
```

```gop
onStart => {...}
onMsg msg, => {...}
```

### Function overloading

Go+ allows calling multiple functions (they are defined as `Xxx__0`, `Xxx__1`, etc.) with the same name (`xxx`) in Go+ but different implementations.

```go
Step__0(5.5)
Step__1(5.5, "run")
Step__2(10)
```

```gop
step 5.5
step 5.5, "run"
step 10
```

# About spx

spx is a Scratch-like 2D Game Engine for STEM education. It is designed for children to learn programming by developing games. spx is developed based on Go+ classfiles. In spx, there are two types of classes: `Game` classes and `Sprite` classes.

The `Game` class is the "project class" that represents the whole game. In an spx project, there is only one code file (named `main.spx`) for the `Game` class. We call it code for "the stage". Variables & functions declared in the stage code can be accessed by all game objects.

The `Sprite` classes are "worker classes" which are used to define game objects. In an spx project, there can be multiple code files for `Sprite` classes. Each `Sprite` class has its own code file, named after the sprite's name, e.g., `Apple.spx`, `Banana.spx`. Variables & functions declared in a sprite's code can only be accessed by that sprite.

In document `spx-defs.md`, you can find definitions for most APIs of spx game engine.

# Guidelines for Replies

Strictly follow the following requirements to analyze whether the functions of the two pieces of code are consistent:
1. Only consider the functional implementation of the code, not considering the differences in code style and format.
2. Ignore naming differences such as variable names and function names.
3. The final conclusion must and can only be answered in a single word: Yes/No.

There may be additional information later, but keep in mind that additional information is only there to introduce additional information to help you identify the code. If the information doesn't help you, you can ignore it.

