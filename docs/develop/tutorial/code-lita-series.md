# Code: Lita — the 28-course series

A single series that takes a beginner from "there is someone here to help me" to writing a whole
program unaided. Every course is a radish-collecting level starring **Lita**; the game world never
changes, so each new idea arrives against a familiar backdrop.

## Design rules

**One new idea per course, at most.** Roughly a third of the courses introduce something new; the
rest are variation, combination, and challenge. A concept is introduced, then practised in a
mirrored form, then combined with what came before, and every few courses a **from-scratch
challenge** asks the learner to put it together with no scaffold.

**The form rotates, not just the content.** A course opens in one of three shapes:

| Shape | The editor opens with | Used by |
|---|---|---|
| **From scratch** | empty | 1, 4, 6–10, 12, 16–18, 20, 22, 24–26, 28 |
| **Scaffold** | a frame with `// 该做什么呢` comments | 14, 15, 21, 23, 27 |
| **Starter code** | working (or deliberately not-quite-working) code | 2, 3, 5, 11, 13, 19 |

**World rules are taught where they first bite**, in one line, never repeated: radishes are
collected on touch (2), trees block the way (5), fences block and paths don't (7), radishes are
ripe or not and green ones refuse to be picked (15), watering speeds ripening (26).

**Completion is judged by the game, never by matching code.** Every prompt says so explicitly: if
the radishes are collected, the course is passed, whatever the code looks like.

**Motivation before mechanism.** The tedium comes first and the tool second: course 10 makes the
learner write the same two lines four times, and course 19 hands them `repeat` for the *same
level*. Course 12 lets Lita slide sideways like a crab; course 13 offers `turnTo` to fix what they
already found silly.

## The seven blocks

| # | Course | New idea | Level |
|---|---|---|---|
| **1** | **认识环境** ||
| 1 | 你好，Lita | asking the copilot for help | 1 radish, no code needed |
| 2 | 第一次运行 | the run button; touch collects | `step 160` pre-written |
| **2** | **走与转** ||
| 3 | 量一量 | the number is a distance; **the ruler** | distance 233 — miserable to guess |
| 4 | 自己写第一行 | the API references panel is a dictionary | distance 187, empty editor |
| 5 | 转个弯 | `turn Right`; trees block | first leg given, append the turn |
| 6 | 另一边 | — (mirror: `turn Left`) | mirrored level, from scratch |
| 7 | 绕过去 | — (**thinking**: plan the route first) | a wall of 4 trees, U-shaped detour |
| 8 | 其实是数字 | **`Right` was `90` all along**; ruler reads angles | diagonal radish: `turn 63` |
| 9 | 负数的方向 | `Left` is `-90` — angles can be negative | other diagonal: `turn -45` |
| 10 | 大挑战 I | — (combines step + turn) | 4 radishes in a square; **deliberately repetitive** |
| **3** | **对象** ||
| 11 | 叫它的名字 | `stepTo` — things have names | hand-computed angles miss by a hair |
| 12 | 一个接一个 | — (practice) | 3 radishes; Lita slides sideways |
| 13 | 转过身来 | `turnTo` | fixes the crab walk |
| **4** | **条件** ||
| 14 | 如果 | `if` and `==`; **random heading each run** | code must handle what the author can't know |
| 15 | 要么这样，要么那样 | `if / else`; ripe vs green; `IsMature()` | one of two radishes is ripe, randomly |
| 16 | 大挑战 II | — (both unknowns at once) | random heading **and** random ripeness |
| **5** | **数据** ||
| 17 | 给数字起名字 | `var` | three equal legs; change one place |
| 18 | 改变它 | assignment (`=` vs course 14's `==`) | shrinking legs: 160/120/80/40 |
| **6** | **循环** ||
| 19 | 重复的味道 | `repeat` | **the same level as course 10**, refactored |
| 20 | 螺旋 | — (loop × angle × variable) | inward spiral |
| 21 | 一筐萝卜 | arrays + `for in` | a basket exists so a loop can walk it |
| 22 | 等它熟 | `waitUntil` | the radish ripens on its own |
| 23 | 收到齐为止 | — (`for in` + `waitUntil`) | three radishes, three different clocks |
| 24 | 大挑战 III | — (arrays + `if` + `waitUntil`) | from scratch |
| **7** | **函数调用** ||
| 25 | 代码里的尺子 | `distanceTo` returns a value; **it was all functions** | Lita says the distance out loud |
| 26 | 浇浇水 | `Water()`; watering speeds ripening | walk close, water, wait, collect |
| 27 | 熟的收，生的浇 | — (everything together) | 4 radishes, mixed ripeness |
| 28 | 毕业设计 | — (graduation) | 5 radishes, empty editor, no scaffold |

## Two moments worth protecting

**Course 8 is a reveal, not a lesson.** After four courses of `turn Right`, the learner is told:
the `Right` you have been typing *is* `90`. Nothing new is added — something already used becomes
visible. `Left = -90` in course 9 brings negative numbers in for free, with a concrete meaning.

**Course 25 is the same trick, one level up.** `Radish.IsMature()` has been used since course 15 as
"a question you ask the radish", and `stepTo`/`step` since the very beginning. Course 25 names it:
those were all functions, and `distanceTo` hands a number *back*. Deliberately, function definition
is **not** taught here — only that calling is a thing they have been doing all along.

## Course 1's Hello World easter egg

Course 1 completes on **any** message. But if the message contains `Hello World` (any casing, or
the Chinese equivalent), the copilot warmly explains the tradition — nearly every programmer's
first program says exactly this — and tells them they just joined it.

The prompt explicitly forbids hinting at this when the message *isn't* Hello World. A surprise you
are told to look for is not a surprise.

## Verification status

Every course's reference answer was executed against the real runtime (the same WASM engine users
run) via the [course runner harness](./verifying-courses.md), checking that **every** radish in the
level is collected — not just one.

- **27 of 27** courses with code pass. Course 1 has no code to run.
- The **prompts** (guidance behaviour, opening sequence, completion judgement) are not covered by
  this: they need a signed-in session with a live copilot.

Three engine constraints were found this way and are baked into the courses:

1. **Bare top-level code is spx's "Main" and has an execution timeout.** Anything that runs for a
   few seconds is killed partway — and collisions along the way never register either, so the level
   looks unsolvable rather than slow. Long-running courses put their work in `onStart`.
2. **An inline array literal does not compile** at top level (`unreachable`). Declare, then assign.
3. **Watering must happen outside the touch radius.** Lita (half-width 16) and a radish (12) overlap
   at ~28 units, and `onTouchStart` only fires on the *transition* into contact — stand at 20 and
   Lita is already touching while the radish is green, so it never fires again once it ripens.
   Courses stand off by 60.
