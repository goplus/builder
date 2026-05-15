# XGo Syntax Cheatsheet

## Basic syntax

```csv
Package,Name,Sample,Description
,for_iterate,for v in [] {},Iterate within given list
,for_iterate_with_index,"for i, v in [] {}",Iterate with index within given list
,for_loop_with_condition,for true {},Loop with condition
,for_loop_with_range,for i in 1:5 {},Loop with range
,func_declaration,func name(params) returnType {},"Function declaration, e.g., `func add(a int, b int) int {}`"
,if_else_statement,if true {} else {},If else statement
,if_statement,if true {},If statement
,import_declaration,"import ""package""","Import package declaration, e.g., `import ""fmt""`"
fmt,println,"println ""Hello, World!""",Print given message
,var_declaration,var name type,"Variable declaration, e.g., `var count int`"
```

## Shorter expression styles

- `println "Hello"` is a valid command-line style call in XGo
- `[1, 2, 3]` is a list literal
- `{ "Monday": 1 }` is a map literal
- `onStart => {}` is a lambda-style callback form

## Reminder

When a syntax detail is not covered by XGo-specific sugar, follow normal Go syntax rules.
