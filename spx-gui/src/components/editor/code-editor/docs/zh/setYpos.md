```gop
var is_up_state bool
var y float32

// 自动循环切换精灵造型
onStart => {
    for {
        nextCostume
        wait 0.3
    }
}

play "background"

onStart => {
    for {
        if !is_up_state {
            setYpos 11
            setYpos ypos-1
        }
        wait 0.008
        if ypos < -180 {
            setYpos 0
        }
    }
}


onKey KeySpace, => {
    if !is_up_state {
        is_up_state = true
        glide xpos, ypos+40, 0.2
        is_up_state = false
    }
}


// this is for comment test
/*
long comment test
*/
var isUpState bool
setYpos (Y: float32): bool
var test = `
this should perform like le string conent ()
`
const test2 = "string content"
const test3 = "231"

onStart => {
    setYpos yPos + 1
}

func add(a int, b int) {
    return a + b
}

println((((((((add(1, 2)))))))))

num := 1_000_000 //Go+ support, same as 1000000
println num

println int(true)       //Go+ support cast bool to int
println float64(true)   //and to float64
println complex64(true) //and to complex64, and so on.

println 20+20
println 20+30
println 0x14      //in hex
println 0o24      //in octal
println 0b0010100 // binary

c := int128(12345) // If you want a different type of integer, you can use casting.
println c

u128 := uint128(12345)
println(u128)
f0 := 42e1   // 420
f1 := 123e-2 // 1.23
f2 := 456e+2 // 45600
f3 := 1.0
println(f0, f1, f2, f3, f0/0)

var flag bool // no value assigned, set to false
var isAwesome = true

println(flag, isAwesome)

if 7%2 == 0 {
    println "7 is even"
} else {
    println "7 is odd"
}
if 8%4 == 0 {
    println "8 is divisible by 4"
}
if num := 9; num < 0 {
    println num, "is negative"
} else if num < 10 {
    println num, "has 1 digit"
} else {
    println num, "has multiple digits"
}


import (
    "time"
)
i := 2
print "Write ", i, " as "
switch i {
case 1:
    println "one"
case 2:
    println "two"
case 3:
    println "three"
}
switch time.now().weekday() {
case time.Saturday, time.Sunday:
    println "It's the weekend"
default:
    println "It's a weekday"
}
t := time.now()
switch {
case t.hour() < 12:
    println "It's before noon"
default:
    println "It's after noon"
}
score := 80
switch {
case score < 50:
    printf "%d < 50\n", score
    fallthrough
case score < 100:
    printf "%d < 100\n", score
    fallthrough
case score < 200:
    printf "%d < 200\n", score
}

samples := []string{"hello", "apple_π!"}
outer:
    for _, sample := range samples {
        for i, r := range sample {
            println(i, r, string(r))
            if r == 'l' {
                continue outer
            }
        }
        println()
    }
q := []int{2, 3, 5, 7, 11, 13}
println q

r := []bool{true, false, true, true, false, true}
println r

s := []struct {
    i int
    b bool
}{
    {2, true},
    {3, false},
    {5, true},
    {7, true},
    {11, false},
    {13, true},
}
println s


var s []int

println s, len(s), cap(s)

if s == nil {
    println "nil!"
}

println map[string]int{"Hello": 1, "xsw": 3}
println map[string]float64{"Hello": 1, "xsw": 3.4}
println map[string]interface{}{"Hello": 1, "xsw": "Go+"}
println map[int]interface{}{1: 1.4, 3: "Go+"}
println map[string]interface{}{}

first := 100
second := &first
first++
*second++
var myNewPointer *int
myNewPointer = second
*myNewPointer++
println("First:", first)
println("Second:", *second)

odds := [x for x <- 1:10:2]
evens := [x for x <- 2:10:2]
println "odds:", odds
println "evens:", evens
squares := [[x, x*x] for x <- 0:10]
println "squares:", squares
iterated := [[[y, [x, x*x, x+y]] for y <- 0:10] for x <- 0:10]
println "Tracking iterations:", iterated
str := "goplus/tutorials"
println [x for x <- str.split("")]
SplitOn := func(ch, str string) []string {
    return [x for x <- str.split(ch)]
}
println SplitOn("t", "goplus/tutorials")

func returnLambda() func(string) {
    return func(msg string) {
        println msg
    }
}

consoleLog := returnLambda()
consoleLog "Hello"

func transform(a []float64, f func(float64) float64) []float64 {
    return [f(x) for x <- a]
}

y := transform([1, 2, 3], x => x * x)
println y // [1 4 9]

z := transform([-3, 1, -5], x => {
    if x < 0 {
        return -x
    }
    return x
})
println z // [3 1 5]
```
---
移动到指定位置

