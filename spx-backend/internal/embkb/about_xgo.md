# About XGo

The XGo programming language is

* Superset of the Go language
* Statically typed
* With special features focusing on simplicity and efficiency

In document `xgo-syntax.md`, you can find some definitions for XGo language syntax.

## How XGo simplifies Go's expressions

### Program structure

XGo allows omitting package main and func main.

```go
package main

import "fmt"

func main() {
	fmt.Println("Hi")
}
```

```xgo
import "fmt"

fmt.Println("Hi")
```

### Builtin functions

XGo provides more builtin functions. It simplifies the expression of the most common tasks.

```go
fmt.Println("Hi")
```

```xgo
println("Hi")
```

### Command-line style

XGo recommends command-line style code, which is a special style for function-calls whose return values are not used:

```go
println("Hi")
```

```xgo
println "Hi"
```

### List literals

```go
a := []int{1, 2, 3}
```

```xgo
a := [1, 2, 3]
```

### Map literals

```go
a := map[string]int{
	"Monday": 1,
	"Tuesday": 2,
}
```

```xgo
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

```xgo
onStart => {...}
onMsg msg, => {...}
```

### Function overloading

XGo allows calling multiple functions (they are defined as `Xxx__0`, `Xxx__1`, etc.) with the same name (`xxx`) in XGo but different implementations.

```go
Step__0(5.5)
Step__1(5.5, "run")
Step__2(10)
```

```xgo
step 5.5
step 5.5, "run"
step 10
```

### Classfiles

XGo classfiles provide a mechanism to abstract domain knowledge, making XGo more accessible and friendly to various user groups, especially those new to programming or unfamiliar with object-oriented programming concepts. Instead of explicitly defining classes using `type` and `struct` keywords as in Go, XGo allows defining classes using a simpler, more intuitive syntax within files called classfiles.

Key Aspects of XGo Classfiles:

* Simplified Syntax: Classfiles define classes using a syntax closer to sequential programming. Variables and functions are declared directly within the classfile, eliminating the need for explicit `struct` and method declarations.
* Abstraction of Domain Knowledge: The primary purpose is to abstract domain-specific knowledge. This is achieved by defining a base class for a project and organizing related worker classes under it.
* Project and Worker Classes: A classfile typically consists of a project class and multiple worker classes. The project class represents the main entity, while worker classes represent supporting components.

Under the hood, XGo classfiles will be compiled into Go code with `struct` and method declarations, allowing seamless integration with existing Go codebases.
