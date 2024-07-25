# Compiler

目前前端实现能力需要提供的内容就是以下几个类型：

1. 获取Identity（类型，名称，包，函数签名，变量名，具体单位->需要设定函数签名的具体@值，或实现多语言）
2. 获取行内提示（每次对代码修改之后的，一次性获取）（位置，类型->'形参名、单位名、特定场景针对play声音展示ICON的类型'）
3. 提供语法检查出的内容（类型详见：Part.错误类型，提供位置跟分级提示）
4. 提供补全列表的list （方法1：在键入第一个字的时候就运行，然后之后只filter，方法2：每次键入都运行（不大可能））

## 模式

只向前端提供前端想要的内容，然后剩余的内容由compiler内部封装和组织。

- 提供

1. 获取行内提示
2. 获取错误提示
3. 获取补全列表
4. 获取Identity类型

- 内部实现

1. 根据代码生成AST树
2. 定义完整叶子结点信息（类型，名称，包，函数签名，变量名，具体单位）
3. 维护符号表？
4. 类型推断

![compiler-completionItem](./img/compiler-completionItem.png)

- 对外接口

```ts
interface Compiler {
    getInlayHints(fileUri: URI): InlayHint[]
    getDiagnostics(fileUri: URI): Diagnostic[]
    getCompletionItems(fileUri: URI, position: Position): CompletionItem[]
    // hover
    getDefinition(fileUri: URI, position: Position): Identifier | null
}
```

## WASM 数据传输方案

!设置GO项目环境`GOOS=js;GOARCH=wasm`



## 错误类型

### Syntax

1. Typographical Errors

```go
printtln("Hello World") // should be Println
```

2. Missing Symbols
3. Mismatched Symbols

```go
str := "Hello world 
// should be "Hello world"
```

4. Incorrect Statement Structure

```go
var x int var y int
```

5. Incomplete Statements

```go
if x > 0 //missing {
```

6. Illegal use of operators

```go
x := 5 +
```

7. Misuse of reserved words

```go
var func = 10 // func is a reserved word of go
```

8. Incorrect control structures

```go
for i := 0; i < 10; i++ // missing {}
fmt.Println(i)
```

### Type

1. Type Mismatch

```go
var x int = "Hello"
//mismatch
```

2. Function Argument Type Error

```go
func fn(a int) {

}
fn("abc")
// should be fn(123)
```

3. Using Uninitialized Variables

```go
var x int
fmt.Println(x)
```

4. Undeclared Variables

```go
fmt.Println(y)
// should be var y int
```

5. Return types errors

```go
func fn() int {
    return "abc"
}
// should be return 123
```

6. Out of bounds

```go
arr := []int{1, 2, 3}
fmt.Println(arr[3])
// should be arr[2]
```

### Logic

1. Incorrect conditions

```go
x := 10
if x = 5 { // should be x == 5
    //do some thing
}
```

2. Loop errors

```go
for i := 0; i < 10; { // bad loop
    fmt.Println(i)
}
```
