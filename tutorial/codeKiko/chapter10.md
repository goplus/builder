## 第十章：函数定义与调用 - 组织代码

在前面的学习中，我们编写了越来越多的代码。但你可能发现了一个问题：有些代码会**重复出现**！

比如在第 8.4 节的农场游戏中：
- 种植萝卜的代码有十几行
- 浇水的代码也有十几行
- 收获的代码又有十几行

如果要在多个地方使用这些功能，就要复制粘贴很多次。这样：
- 代码变得很长
- 难以阅读和理解
- 修改时要改很多地方
- 容易出错

有没有更好的方法？答案是：**函数**（Function）！

### 什么是函数？

**函数**是一段有名字的代码块：
- 可以把常用的代码封装起来
- 给它起一个名字
- 需要时调用这个名字
- 代码就会自动执行

**类比**：
- 函数就像一个"代码食谱"
- 你把做菜的步骤写下来（定义函数）
- 给它起个名字，比如"红烧肉"
- 需要时说"做红烧肉"（调用函数）
- 就会按照食谱做菜（执行代码）

**函数的好处**：
1. **代码重用**：写一次，到处用
2. **易于维护**：只需改一个地方
3. **提高可读性**：用名字表达意图
4. **降低复杂度**：把大问题分解成小问题

### 10.1 定义函数与调用

#### 学习目标

这一节，我们将学习函数的基础知识。你将学会：
- 如何定义函数
- 如何调用函数
- 用函数组织代码
- 让代码更简洁和易读

我们将重新实现第 8.4 节的农场游戏，但这次用函数来组织代码！

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-52/sprites/Kiko/code

#### 回顾：第 8.4 节的代码

在第 8.4 节，我们的代码是这样的：

```go
onKey KeyQ, => {
    // 找一个 离Kiko 最近的可以种萝卜的地方
    rad, ok := Farmland.planting(xpos, ypos)
    if ok {
        turnTo rad
        step distanceTo(rad)-20
        rad.show
    }
}

onKey KeyW, => {
    // 找一个离 Kiko 最近的已种植的萝卜
    rad, ok := Farmland.findPlant(xpos, ypos)
    if ok && !rad.IsMature() {
        turnTo rad
        step distanceTo(rad)-20
        rad.Water()
        animateAndWait "浇水"
        animate "默认", true
    }
}
```

**问题**：
- 种植、浇水、收获的逻辑都写在事件处理器里
- 代码混在一起，不够清晰
- 如果要在其他地方使用相同功能，要复制代码

#### 使用函数重构

现在我们用函数来组织这些代码：

**完整代码：**

**函数定义部分**：
```go
func plant() {
    // 是否站在农田上
    if f, ok := findFarm(xpos, ypos); ok {
        // 找一个离Kiko最近的可以种萝卜的地方
        rad, ok := f.findPlot(xpos, ypos)
        if ok {
            turnTo rad
            step distanceTo(rad)-20
            rad.show
        }
    }
}

func water() {
    if f, ok := findFarm(xpos, ypos); ok {
        // 找一个离Kiko最近的萝卜
        rad, ok := f.findPlant(xpos, ypos)
        if ok && !rad.IsMature() {
            turnTo rad
            step distanceTo(rad)-20
            rad.Water()
            animateAndWait "浇水"
            animate "默认", true
        }
    }
}

func harvest() {
    if f, ok := findFarm(xpos, ypos); ok {
        // 找一个离Kiko最近的萝卜
        rad, ok := f.findPlant(xpos, ypos)
        if ok && rad.IsMature() {
            turnTo rad
            stepTo rad
        }
    }
}
```

**函数调用部分**：
```go
onKey KeyQ, => {
    plant()
}

onKey KeyW, => {
    water()
}

onKey KeyE, => {
    harvest()
}
```

**对比效果**：

**之前**：
- 事件处理器中有很多代码
- 逻辑不清晰
- 难以重用

**现在**：
- 事件处理器只有一行代码
- 逻辑清晰：按 Q 就种植，按 W 就浇水
- 函数可以在任何地方调用

#### 函数定义详解

**基本语法**：

```go
func 函数名() {
    函数体
}
```

**示例 - plant 函数**：

```go
func plant() {
    // 是否站在农田上
    if f, ok := findFarm(xpos, ypos); ok {
        // 找一个离Kiko最近的可以种萝卜的地方
        rad, ok := f.findPlot(xpos, ypos)
        if ok {
            turnTo rad
            step distanceTo(rad)-20
            rad.show
        }
    }
}
```

**组成部分**：

1. **func 关键字**：
   ```go
   func
   ```
   - 表示这是一个函数定义
   - 必须有

2. **函数名**：
   ```go
   plant
   ```
   - 函数的名字
   - 用来调用这个函数
   - 命名规则和变量相同

3. **参数列表**：
   ```go
   ()
   ```
   - 括号是必须的
   - 这个函数没有参数（括号是空的）
   - 后面会学习带参数的函数

4. **函数体**：
   ```go
   {
       // 函数的代码
   }
   ```
   - 用花括号包围
   - 里面是函数要执行的代码

**plant 函数的逻辑**：

```go
func plant() {
    // 第1步：检查是否在农田上
    if f, ok := findFarm(xpos, ypos); ok {
        
        // 第2步：查找可种植的地块
        rad, ok := f.findPlot(xpos, ypos)
        
        // 第3步：如果找到了
        if ok {
            turnTo rad                    // 转向种植位置
            step distanceTo(rad)-20       // 走到种植位置
            rad.show                      // 显示萝卜
        }
    }
}
```

**工作流程**：
1. 检查 Kiko 是否站在农田上
2. 如果在农田上，查找最近的空地
3. 如果找到空地，执行种植操作

**water 函数的逻辑**：

```go
func water() {
    // 第1步：检查是否在农田上
    if f, ok := findFarm(xpos, ypos); ok {
        
        // 第2步：查找已种植的萝卜
        rad, ok := f.findPlant(xpos, ypos)
        
        // 第3步：如果找到且未成熟
        if ok && !rad.IsMature() {
            turnTo rad                    // 转向萝卜
            step distanceTo(rad)-20       // 走到萝卜旁
            rad.Water()                   // 浇水
            animateAndWait "浇水"          // 播放浇水动画
            animate "默认", true           // 恢复默认动画
        }
    }
}
```

**工作流程**：
1. 检查是否在农田上
2. 查找最近的已种植萝卜
3. 如果找到且萝卜未成熟，执行浇水操作

**harvest 函数的逻辑**：

```go
func harvest() {
    // 第1步：检查是否在农田上
    if f, ok := findFarm(xpos, ypos); ok {
        
        // 第2步：查找已种植的萝卜
        rad, ok := f.findPlant(xpos, ypos)
        
        // 第3步：如果找到且已成熟
        if ok && rad.IsMature() {
            turnTo rad          // 转向萝卜
            stepTo rad          // 走到萝卜（收获）
        }
    }
}
```

**工作流程**：
1. 检查是否在农田上
2. 查找最近的已种植萝卜
3. 如果找到且萝卜已成熟，执行收获操作

#### 函数调用详解

**基本语法**：

```go
函数名()
```

**示例**：

```go
onKey KeyQ, => {
    plant()    // 调用 plant 函数
}

onKey KeyW, => {
    water()    // 调用 water 函数
}

onKey KeyE, => {
    harvest()  // 调用 harvest 函数
}
```

**多次调用**：

函数可以被多次调用：

```go
onKey KeyQ, => {
    plant()    // 第1次调用
}

onStart => {
    plant()    // 第2次调用
}

onClick => {
    plant()    // 第3次调用
}
```

每次调用都会执行一次函数体的代码。

#### 函数的优势

**优势 1：代码重用**

**不用函数（重复代码）**：
```go
onKey KeyQ, => {
    if f, ok := findFarm(xpos, ypos); ok {
        rad, ok := f.findPlot(xpos, ypos)
        if ok {
            turnTo rad
            step distanceTo(rad)-20
            rad.show
        }
    }
}

onClick => {
    // 又要写一遍相同的代码
    if f, ok := findFarm(xpos, ypos); ok {
        rad, ok := f.findPlot(xpos, ypos)
        if ok {
            turnTo rad
            step distanceTo(rad)-20
            rad.show
        }
    }
}
```

**使用函数（代码重用）**：
```go
func plant() {
    if f, ok := findFarm(xpos, ypos); ok {
        rad, ok := f.findPlot(xpos, ypos)
        if ok {
            turnTo rad
            step distanceTo(rad)-20
            rad.show
        }
    }
}

onKey KeyQ, => {
    plant()    // 调用函数
}

onClick => {
    plant()    // 再次调用，不需要重复代码
}
```

**优势 2：易于维护**

**不用函数**：
```go
// 如果要修改种植逻辑，要改多个地方

onKey KeyQ, => {
    // 种植代码
    step distanceTo(rad)-20  // 要改这里
}

onClick => {
    // 种植代码
    step distanceTo(rad)-20  // 还要改这里
}

onMsg "plant", => {
    // 种植代码
    step distanceTo(rad)-20  // 还要改这里
}
```

**使用函数**：
```go
func plant() {
    // 种植代码
    step distanceTo(rad)-30  // 只需改一个地方
}

onKey KeyQ, => {
    plant()    // 自动使用新逻辑
}

onClick => {
    plant()    // 自动使用新逻辑
}

onMsg "plant", => {
    plant()    // 自动使用新逻辑
}
```

**优势 3：提高可读性**

**不用函数（代码冗长）**：
```go
onKey KeyQ, => {
    if f, ok := findFarm(xpos, ypos); ok {
        rad, ok := f.findPlot(xpos, ypos)
        if ok {
            turnTo rad
            step distanceTo(rad)-20
            rad.show
        }
    }
}

onKey KeyW, => {
    if f, ok := findFarm(xpos, ypos); ok {
        rad, ok := f.findPlant(xpos, ypos)
        if ok && !rad.IsMature() {
            turnTo rad
            step distanceTo(rad)-20
            rad.Water()
            animateAndWait "浇水"
            animate "默认", true
        }
    }
}
```
- 代码很长
- 不容易看出做什么

**使用函数（清晰简洁）**：
```go
onKey KeyQ, => {
    plant()      // 一看就知道：种植
}

onKey KeyW, => {
    water()      // 一看就知道：浇水
}

onKey KeyE, => {
    harvest()    // 一看就知道：收获
}
```
- 代码简洁
- 意图清晰

**优势 4：降低复杂度**

函数把复杂问题分解成小问题：

```
复杂任务：农场管理
  ↓
分解为：
  - plant()：种植
  - water()：浇水
  - harvest()：收获
  ↓
每个函数处理一个小任务
```

#### 函数的位置

**函数定义应该放在哪里？**

**推荐位置**：
```go
// 1. 变量定义
var score int

// 2. 函数定义
func plant() {
    // ...
}

func water() {
    // ...
}

// 3. 事件处理器
onStart => {
    // ...
}

onKey KeyQ, => {
    plant()
}
```

**原则**：
- 函数定义放在文件前部
- 事件处理器放在文件后部
- 相关的函数放在一起

#### 本节重点

| 概念 | 说明 | 示例 |
|------|------|------|
| 函数定义 | 创建函数 | `func plant() { }` |
| 函数调用 | 使用函数 | `plant()` |
| 函数名 | 函数的标识 | `plant`, `water` |
| 函数体 | 函数的代码 | `{ }` 中的内容 |
| 代码重用 | 写一次，多处用 | 多次调用同一函数 |
| 抽象 | 隐藏细节 | 只需知道函数名 |

#### 恭喜你！

你现在已经掌握了：
- 定义函数封装代码
- 调用函数执行代码
- 用函数组织代码结构
- 提高代码的可读性和可维护性
- 实现代码重用

函数是编程中最重要的概念之一，你已经掌握了它的基础！

---

**下一节预告**：我们已经学会了定义和调用函数，但现在的函数只能在定义它的精灵中使用。如果多个精灵都需要相同的功能怎么办？下一节将学习如何在舞台定义**公用函数**，让所有精灵都能使用！

### 10.2 多角色公用函数

#### 学习目标

在上一节中，我们学会了定义和调用函数。但有一个问题：如果在 Kiko 中定义了 `plant` 函数，Jenny 就不能使用！

想象这个场景：
- Kiko 和 Jenny 都需要种植、浇水、收获
- 如果在每个精灵中都定义一遍这些函数
- 代码会重复很多次
- 修改时要改多个地方

有没有办法让多个精灵**共享**同一个函数？答案是：在**舞台**中定义函数！

这一节，我们将学习：
- 在舞台中定义公用函数
- 多个精灵调用同一个函数
- 使用 `this` 关键字
- 理解函数参数的作用

#### 新的挑战：双人农场游戏

这次我们要制作一个双人协作的农场游戏：

**游戏设定**：
- Kiko 和 Jenny 都可以进行农场操作
- 点击精灵切换控制谁
- 两个精灵共享相同的功能

**操作方式**：
- **方向键**（↑↓←→）：移动当前选中的角色
- **Q 键**：种植萝卜
- **W 键**：浇水
- **E 键**：收获萝卜
- **鼠标点击**：切换控制的角色

**关键**：种植、浇水、收获的函数只定义一次，但 Kiko 和 Jenny 都能使用！

#### 代码结构

**舞台代码（公用函数定义）**：

```go
var (
    followRole string
)

// 公用移动函数
func moveDir(s Sprite, dir Direction, n float64) {
    if s.name != followRole {
        return
    }
    if s.heading != dir {
        s.setHeading dir
    }
    s.step n
}

// 公用种植函数
func plant(s Sprite) {
    if s.name != followRole {
        return
    }
    if f, ok := findFarm(s.xpos, s.ypos); ok {
        rad, ok := f.findPlot(s.xpos, s.ypos)
        if ok {
            s.turnTo rad
            s.step s.distanceTo(rad)-20
            rad.show
        }
    }
}

// 公用浇水函数
func water(s Sprite) {
    if s.name != followRole {
        return
    }
    if f, ok := findFarm(s.xpos, s.ypos); ok {
        rad, ok := f.findPlant(s.xpos, s.ypos)
        if ok && !rad.IsMature() {
            s.turnTo rad
            s.step s.distanceTo(rad)-20
            rad.Water()
            s.animateAndWait "浇水"
            s.animate "默认", true
        }
    }
}

// 公用收获函数
func harvest(s Sprite) {
    if s.name != followRole {
        return
    }
    if f, ok := findFarm(s.xpos, s.ypos); ok {
        rad, ok := f.findPlant(s.xpos, s.ypos)
        if ok && rad.IsMature() {
            s.turnTo rad
            s.stepTo rad
        }
    }
}

onStart => {
    followRole = Kiko.name
}
```

**Kiko 精灵代码（调用公用函数）**：

```go
// 方向控制
onKey KeyUp, => {
    moveDir this, Up, 20
}

onKey KeyDown, => {
    moveDir this, Down, 20
}

onKey KeyLeft, => {
    moveDir this, Left, 20
}

onKey KeyRight, => {
    moveDir this, Right, 20
}

// 农场操作
onKey KeyQ, => {
    plant this
}

onKey KeyW, => {
    water this
}

onKey KeyE, => {
    harvest this
}

// 切换控制
onClick => {
    followRole = name
}
```

**Jenny 精灵代码（完全相同）**：

```go
// 方向控制
onKey KeyUp, => {
    moveDir this, Up, 20
}

onKey KeyDown, => {
    moveDir this, Down, 20
}

onKey KeyLeft, => {
    moveDir this, Left, 20
}

onKey KeyRight, => {
    moveDir this, Right, 20
}

// 农场操作
onKey KeyQ, => {
    plant this
}

onKey KeyW, => {
    water this
}

onKey KeyE, => {
    harvest this
}

// 切换控制
onClick => {
    followRole = name
}
```

#### 核心概念：函数参数

**什么是参数？**

**参数**（Parameter）是传递给函数的数据：
- 函数需要知道"对谁"操作
- 通过参数告诉函数
- 每次调用可以传递不同的参数

**类比**：
- 函数像一个"工具"
- 参数像"材料"
- 工具对材料进行加工

例如：
- 函数：`plant`（种植工具）
- 参数：`s Sprite`（要种植的精灵）
- 作用：让指定的精灵执行种植操作

#### moveDir 函数详解

**函数定义**：

```go
func moveDir(s Sprite, dir Direction, n float64) {
    if s.name != followRole {
        return
    }
    if s.heading != dir {
        s.setHeading dir
    }
    s.step n
}
```

**参数说明**：

| 参数 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `s` | `Sprite` | 要移动的精灵对象 | Kiko 或 Jenny |
| `dir` | `Direction` | 移动方向 | `Up`, `Down`, `Left`, `Right` |
| `n` | `float64` | 移动距离 | `20` |

**函数逻辑**：

1. **检查是否被选中**：
   ```go
   if s.name != followRole {
       return
   }
   ```
   - 如果精灵不是当前选中的角色
   - 直接返回（`return`），不执行移动
   - 这确保只有选中的角色能移动

2. **设置朝向**：
   ```go
   if s.heading != dir {
       s.setHeading dir
   }
   ```
   - 如果当前朝向不是目标方向
   - 设置为目标方向
   - 避免重复设置

3. **执行移动**：
   ```go
   s.step n
   ```
   - 让精灵前进 n 步

**调用示例**：

```go
// Kiko 调用
onKey KeyRight, => {
    moveDir this, Right, 20
}
// 意思：让 this（Kiko）向 Right（右）移动 20 步

// Jenny 调用
onKey KeyRight, => {
    moveDir this, Right, 20
}
// 意思：让 this（Jenny）向 Right（右）移动 20 步
```

**执行过程（Kiko 被选中时）**：

```
Kiko 按右键：
  ↓
调用 moveDir(Kiko, Right, 20)
  ↓
检查：Kiko.name == followRole？
  是，继续执行
  ↓
检查：Kiko.heading != Right？
  如果不是右，设置为右
  ↓
执行：Kiko.step(20)
  ↓
Kiko 向右移动

Jenny 按右键：
  ↓
调用 moveDir(Jenny, Right, 20)
  ↓
检查：Jenny.name == followRole？
  否（followRole 是 "Kiko"）
  ↓
return（直接返回，不执行）
  ↓
Jenny 不移动
```

#### plant 函数详解

**函数定义**：

```go
func plant(s Sprite) {
    if s.name != followRole {
        return
    }
    if f, ok := findFarm(s.xpos, s.ypos); ok {
        rad, ok := f.findPlot(s.xpos, s.ypos)
        if ok {
            s.turnTo rad
            s.step s.distanceTo(rad)-20
            rad.show
        }
    }
}
```

**参数说明**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `s` | `Sprite` | 要执行种植操作的精灵 |

**函数逻辑**：

1. **权限检查**：
   ```go
   if s.name != followRole {
       return
   }
   ```
   - 只有选中的精灵才能种植

2. **查找农田**：
   ```go
   if f, ok := findFarm(s.xpos, s.ypos); ok {
   ```
   - 根据精灵的位置查找农田
   - `s.xpos, s.ypos`：精灵的坐标

3. **查找空地**：
   ```go
   rad, ok := f.findPlot(s.xpos, s.ypos)
   ```
   - 在农田中查找可种植的地块

4. **执行种植**：
   ```go
   s.turnTo rad
   s.step s.distanceTo(rad)-20
   rad.show
   ```
   - 精灵转向种植位置
   - 精灵走到种植位置
   - 显示萝卜

**调用示例**：

```go
// Kiko 调用
onKey KeyQ, => {
    plant this
}
// 让 Kiko 执行种植操作

// Jenny 调用
onKey KeyQ, => {
    plant this
}
// 让 Jenny 执行种植操作
```

#### this 关键字

**什么是 this？**

`this` 是一个特殊的关键字：
- 代表**当前精灵对象**
- 在 Kiko 的代码中，`this` 就是 Kiko
- 在 Jenny 的代码中，`this` 就是 Jenny

**为什么需要 this？**

当调用舞台中的函数时，函数需要知道是哪个精灵在调用：

```go
// Kiko 的代码
onKey KeyQ, => {
    plant this  // this = Kiko，告诉 plant 函数操作 Kiko
}

// Jenny 的代码
onKey KeyQ, => {
    plant this  // this = Jenny，告诉 plant 函数操作 Jenny
}
```

**this 的用法**：

```go
// 作为参数传递
plant this
water this
moveDir this, Right, 20

// 访问自己的属性
this.name      // 当前精灵的名字
this.xpos      // 当前精灵的 x 坐标
this.heading   // 当前精灵的朝向
```

#### 参数的传递

**参数传递过程**：

```go
// Kiko 调用
moveDir this, Right, 20
    ↓
// 函数接收
func moveDir(s Sprite, dir Direction, n float64) {
    // s = this (Kiko)
    // dir = Right
    // n = 20
}
```

**对应关系**：

| 调用时 | 函数定义 | 实际值 |
|--------|---------|--------|
| `this` | `s Sprite` | Kiko 对象 |
| `Right` | `dir Direction` | Right 方向 |
| `20` | `n float64` | 20 |

**参数的顺序**：

参数的顺序必须匹配：

```go
// 函数定义
func moveDir(s Sprite, dir Direction, n float64) { }

// 正确调用
moveDir this, Right, 20
//      ↑     ↑      ↑
//      s     dir    n

// 错误调用
moveDir Right, this, 20  // ✗ 顺序错误
moveDir 20, Right, this  // ✗ 顺序错误
```

#### return 语句

**什么是 return？**

`return` 语句用于**提前退出函数**：

```go
func plant(s Sprite) {
    if s.name != followRole {
        return  // 提前退出，不执行后面的代码
    }
    // 后面的代码只有在 s.name == followRole 时才执行
}
```

**return 的作用**：

**没有 return**：
```go
func plant(s Sprite) {
    if s.name != followRole {
        // 即使不是选中的角色
        // 后面的代码还是会执行
    }
    // 这里的代码总是执行
    s.turnTo rad  // 问题：未选中的精灵也会种植
}
```

**使用 return**：
```go
func plant(s Sprite) {
    if s.name != followRole {
        return  // 直接退出函数
    }
    // 这里的代码只有选中的精灵才执行
    s.turnTo rad  // 正确：只有选中的精灵种植
}
```

**return 的执行流程**：

```
进入函数 plant(Kiko)
  ↓
检查：Kiko.name != followRole？
  ├─ 是 → return → 退出函数
  └─ 否 → 继续执行
      ↓
    执行种植代码
      ↓
    函数结束
```

#### 公用函数的优势

**优势 1：避免代码重复**

**不用公用函数**：
```go
// Kiko 的代码
func plant() {
    if f, ok := findFarm(xpos, ypos); ok {
        // 种植逻辑（30行代码）
    }
}

// Jenny 的代码
func plant() {
    if f, ok := findFarm(xpos, ypos); ok {
        // 完全相同的种植逻辑（又是30行代码）
    }
}

// 如果有10个精灵，要重复10次！
```

**使用公用函数**：
```go
// 舞台代码（只写一次）
func plant(s Sprite) {
    if f, ok := findFarm(s.xpos, s.ypos); ok {
        // 种植逻辑（30行代码）
    }
}

// Kiko 的代码
onKey KeyQ, => {
    plant this  // 只需一行
}

// Jenny 的代码
onKey KeyQ, => {
    plant this  // 只需一行
}
```

**优势 2：统一管理**

所有公用逻辑在舞台中：
- 修改一个地方，所有精灵都更新
- 容易维护
- 不会遗漏某个精灵

**优势 3：参数化**

通过参数，同一个函数可以作用于不同对象：

```go
// 同一个 plant 函数
plant(Kiko)   // 让 Kiko 种植
plant(Jenny)  // 让 Jenny 种植
plant(Bob)    // 让 Bob 种植
```

**什么是"关注点分离"？**

公用函数实现了**关注点分离**（Separation of Concerns）：

- **舞台**：定义共享的逻辑（做什么）
- **精灵**：处理特定的事件（什么时候做）

```go
// 舞台：定义"如何种植"
func plant(s Sprite) {
    // 种植逻辑
}

// 精灵：定义"什么时候种植"
onKey KeyQ, => {
    plant this
}
```

#### 本节重点

| 概念 | 说明 | 示例 |
|------|------|------|
| 公用函数 | 在舞台定义，多个精灵共享 | `func plant(s Sprite)` |
| 函数参数 | 传递给函数的数据 | `s Sprite`, `dir Direction` |
| `this` | 当前精灵对象 | `plant this` |
| `return` | 提前退出函数 | `if ... { return }` |
| 参数化 | 通过参数让函数更通用 | 一个函数处理多个对象 |

#### 恭喜你！

你现在已经掌握了：
- 在舞台定义公用函数
- 使用参数让函数更通用
- 使用 `this` 传递当前精灵
- 使用 `return` 控制函数流程
- 实现多个精灵共享同一功能
- 组织大型游戏的代码结构

你已经能够创建复杂的多角色协作游戏了！函数是编程中最强大的工具之一，你已经掌握了它的核心用法。继续加油，编程世界的大门已经向你敞开！

#### 10.2.1 练习：函数定义与调用练习

练习函数定义和调用的综合应用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-54/sprites/Kiko/code
