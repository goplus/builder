## 第九章：跨文件编程 - 多个精灵协同工作

在前面的章节中，我们一直在编写单个精灵（Kiko）的代码。但真实的游戏往往有**多个角色**：
- 玩家控制的主角
- 队友角色
- 敌人角色
- NPC（非玩家角色）

这些角色需要**协同工作**，共同完成游戏任务。这就需要我们学习**多精灵编程**！

### 什么是多精灵编程？

**多精灵编程**是指在一个游戏中为多个精灵编写代码，让它们：
- 各自有独立的行为
- 能够互相配合
- 共享某些信息
- 响应相同的操作

想象一个团队游戏：
- 你可以控制不同的队员
- 每个队员有自己的技能
- 但他们共享同一个目标
- 你可以切换控制哪个队员

### 9.1 精灵文件结构

#### 学习目标

这一节，我们将学习如何组织多个精灵的代码。你将学会：
- 理解精灵代码和舞台代码的区别
- 在不同精灵之间切换编辑
- 使用全局变量在精灵间共享数据
- 实现精灵的选择和控制
- 让多个精灵响应相同的键盘操作

#### 新的挑战：双人协作收集

看看这次的场景，游戏中有两个角色：
- **Kiko**：第一个可控制角色
- **Jenny**：第二个可控制角色

游戏目标：
- 用键盘控制角色移动收集萝卜
- 可以**点击**角色来切换控制谁
- 同一时间只能控制一个角色
- 两个角色可以分工合作

操作方式：
- **WASD 键**：控制当前选中角色的移动
  - W：向上
  - S：向下
  - A：向左
  - D：向右
- **鼠标点击**：切换控制的角色

![Course-47](./assets/跨文件编程-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-47/sprites/Kiko/code

#### 分步教学

**步骤 1：理解代码结构**

在这个游戏中，我们需要编写三个部分的代码：

1. **Kiko 的代码**（Kiko 精灵）
2. **Jenny 的代码**（Jenny 精灵）
3. **舞台代码**（主程序）

**当前代码状态**：

**Kiko 精灵（已完成）**：
```go
onKey KeyD, => {
    if followRole == name {
        if heading != Right {
            setHeading Right
        }
        step 20
    }
}

onKey KeyA, => {
    if followRole == name {
        if heading != Left {
            setHeading Left
        }
        step 20
    }
}

onKey KeyW, => {
    if followRole == name {
        if heading != Up {
            setHeading Up
        }
        step 20
    }
}

onKey KeyS, => {
    if followRole == name {
        if heading != Down {
            setHeading Down
        }
        step 20
    }
}

onClick => {
    followRole = name
}
```

**Jenny 精灵（需要补充）**：
```go
// 需要补充 Jenny 的代码
```

**舞台（已完成）**：
```go
var (
    followRole string
)

onStart => {
    followRole = Kiko.name
}
```

**步骤 2：切换到 Jenny 精灵**

在 XBuilder 中：
1. 点击 Jenny 精灵
2. 代码编辑器会切换到 Jenny 的代码
3. 现在可以编写 Jenny 的代码了

**步骤 3：为 Jenny 添加代码**

Jenny 的代码和 Kiko 完全相同：

**Jenny 精灵（完整代码）**：
```go
onKey KeyD, => {
    if followRole == name {
        if heading != Right {
            setHeading Right
        }
        step 20
    }
}

onKey KeyA, => {
    if followRole == name {
        if heading != Left {
            setHeading Left
        }
        step 20
    }
}

onKey KeyW, => {
    if followRole == name {
        if heading != Up {
            setHeading Up
        }
        step 20
    }
}

onKey KeyS, => {
    if followRole == name {
        if heading != Down {
            setHeading Down
        }
        step 20
    }
}

onClick => {
    followRole = name
}
```

**步骤 4：测试游戏**

运行游戏并测试：
1. 游戏开始时，Kiko 被选中（默认）
2. 按 WASD 键，Kiko 移动
3. 点击 Jenny，切换到 Jenny
4. 按 WASD 键，Jenny 移动
5. 点击 Kiko，切换回 Kiko
6. 两个角色可以轮流操作

#### 代码详解

**舞台代码**

```go
var (
    followRole string
)

onStart => {
    followRole = Kiko.name
}
```

**全局变量定义**：
```go
var (
    followRole string
)
```

- `followRole`：跟随角色，记录当前控制的是谁
- `string`：字符串类型，存储角色的名字
- 定义在**舞台**中，所有精灵都可以访问

**为什么要在舞台定义？**

**舞台**是游戏的主程序：
- 舞台代码对所有精灵可见
- 在舞台定义的变量是**全局变量**
- 所有精灵都可以读取和修改全局变量

**初始化**：
```go
onStart => {
    followRole = Kiko.name
}
```

- 游戏开始时执行
- 设置初始控制角色为 Kiko
- `Kiko.name`：Kiko 精灵的名字属性

**Kiko 精灵代码**

**方向控制**：

```go
onKey KeyD, => {
    if followRole == name {
        if heading != Right {
            setHeading Right
        }
        step 20
    }
}
```

**核心逻辑**：
```go
if followRole == name {
    // 只有当前被选中时才移动
}
```

**工作原理**：

1. **检查是否被选中**：
   ```go
   if followRole == name {
   ```
   - `followRole`：全局变量，当前选中的角色名
   - `name`：当前精灵的名字属性
   - 比较：当前精灵是否是被选中的角色

2. **如果被选中**：
   ```go
   if heading != Right {
       setHeading Right
   }
   step 20
   ```
   - 执行移动操作
   - 和之前学的方向控制一样

3. **如果未被选中**：
   - 不执行任何操作
   - 精灵保持静止

**点击事件**：

```go
onClick => {
    followRole = name
}
```

**作用**：
- 当精灵被点击时触发
- 修改全局变量 `followRole`
- 将其设置为当前精灵的名字
- 相当于"选中"这个精灵

#### 为什么两个精灵的代码相同？

你可能注意到，Kiko 和 Jenny 的代码完全一样。这是因为：

**相同的行为模式**：
- 两个精灵都需要响应 WASD 键
- 两个精灵都需要检查是否被选中
- 两个精灵都需要响应点击切换

**不同的身份**：
- 虽然代码相同，但 `name` 属性不同
- Kiko 的 `name` 是 "Kiko"
- Jenny 的 `name` 是 "Jenny"
- 这让相同的代码产生不同的效果

**类比**：
- 就像两个人用同一份食谱做饭
- 食谱（代码）是一样的
- 但做饭的人（精灵）不同
- 做出来的菜（行为）也有细微差别

#### name 属性

**什么是 name？**

```go
name
```

`name` 是精灵的**内置属性**：
- 存储精灵的名字
- 每个精灵都有这个属性
- 由系统自动设置

**示例**：
```go
// 在 Kiko 的代码中
name  // 值是 "Kiko"

// 在 Jenny 的代码中
name  // 值是 "Jenny"
```

**访问其他精灵的 name**：
```go
Kiko.name   // "Kiko"
Jenny.name  // "Jenny"
```

**用途**：
- 识别当前精灵
- 比较是否是特定精灵
- 在消息中传递精灵信息

#### 本节重点

| 概念 | 说明 | 示例 |
|------|------|------|
| 多精灵编程 | 为多个精灵编写代码 | Kiko 和 Jenny |
| 舞台代码 | 游戏的主程序 | 定义全局变量 |
| 精灵代码 | 特定精灵的行为 | 响应键盘和点击 |
| 全局变量 | 所有精灵共享的变量 | `followRole` |
| `name` 属性 | 精灵的名字 | `"Kiko"`, `"Jenny"` |
| 角色切换 | 改变当前控制的角色 | 点击切换 |
| WASD 控制 | 用 WASD 键控制移动 | W/A/S/D |

#### 恭喜你！

你现在已经掌握了：
- 理解多精灵编程的概念
- 区分舞台代码和精灵代码
- 使用全局变量在精灵间共享信息
- 使用 `name` 属性识别精灵
- 实现角色的选择和切换
- 让多个精灵响应相同的操作
- 使用 WASD 键控制移动

你已经能够创建多角色协作的游戏了！

---

**下一节预告**：我们已经学会了通过全局变量让精灵共享信息，但这种方式有局限性。如果要让精灵之间发送**消息**，触发特定的行为呢？下一节将学习**消息广播系统**（broadcast & onMsg），这是精灵间通信的更强大方式！

#### 9.1.1 练习：精灵文件结构

练习多精灵文件结构的使用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-48/sprites/Kiko/code

**练习内容：**
掌握如何组织和管理多个精灵文件的代码结构。

### 9.2 跨精灵通信：broadcast & onMsg

#### 学习目标

在上一节中，我们学会了用全局变量让精灵共享信息。但这种方式有局限性：
- 只能传递简单的数据
- 不能触发特定的行为
- 需要精灵主动检查变量

这一节，我们将学习一种更强大的精灵间通信方式：**消息系统**。你将学会：
- 使用 `broadcast` 发送消息
- 使用 `onMsg` 接收消息
- 实现精灵之间的对话
- 理解事件驱动的通信模式

#### 新的挑战：精灵对话

想象这个场景：Kiko 和 Jenny 相对而立，他们要进行一段对话：

**对话流程**：
1. Kiko 先说："你好，Jenny"
2. Jenny 收到 Kiko 的问候
3. Jenny 回应："你好，Kiko"

**挑战**：
- Kiko 怎么"通知"Jenny？
- Jenny 怎么知道 Kiko 说话了？
- 如何让 Jenny 在 Kiko 说完后再回应？

这就需要用到**消息系统**！

![Course-49](./assets/跨文件编程-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-49/sprites/Kiko/code

#### 完整代码

**舞台代码：**
```go
var (
    followRole string
)
```

**Kiko 精灵代码：**
```go
onStart => {
    say "你好 Jenny"
    broadcast "hello"
}
```

**Jenny 精灵代码：**
```go
onMsg "hello", => {
    wait 1
    say "你好 Kiko"
}
```

#### 代码详解

**Kiko 的代码 - 发送消息**

```go
onStart => {
    say "你好 Jenny"
    broadcast "hello"
}
```

**第 1 步：显示文字**
```go
say "你好 Jenny"
```
- `say`：让精灵说话（显示文字气泡）
- `"你好 Jenny"`：要显示的文字内容
- Kiko 会显示一个文字气泡："你好 Jenny"

**say 命令的特点**：
```go
say "文字内容"          // 一直显示，直到下一次 say
say "文字内容", 秒数    // 显示指定秒数后消失
```

**示例**：
```go
say "你好"           // 一直显示"你好"
say "你好", 2        // 显示"你好"2秒后消失
say "再见", 1        // 显示"再见"1秒后消失
```

**第 2 步：广播消息**
```go
broadcast "hello"
```
- `broadcast`：广播命令，发送消息
- `"hello"`：消息的名称
- 这条消息会被发送给**所有对象**

**broadcast 的工作原理**：

```
Kiko 执行 broadcast "hello"
    ↓
消息 "hello" 被发送到游戏中
    ↓
所有监听 "hello" 消息的对象收到通知
    ↓
执行对应的 onMsg 处理器
```

**Jenny 的代码 - 接收消息**

```go
onMsg "hello", => {
    wait 1
    say "你好 Kiko"
}
```

**消息监听器**
```go
onMsg "hello", => {
```
- `onMsg`：监听消息的事件处理器
- `"hello"`：要监听的消息名称
- 当收到名为 "hello" 的消息时，执行花括号内的代码

**onMsg 的语法**：
```go
onMsg "消息名称", => {
    // 收到消息后要做的事
}
```

**等待命令**
```go
wait 1
```
- `wait`：等待命令
- `1`：等待的秒数
- 程序会暂停 1 秒，然后继续执行

**为什么要等待？**
- 让对话更自然
- 给玩家时间看清 Kiko 说的话
- 避免两句话同时出现

**回应**
```go
say "你好 Kiko"
```
- Jenny 显示回应的文字
- 完成对话

#### 消息系统详解

**什么是消息系统？**

**消息系统**是一种通信机制：
- **发送者**：广播消息（broadcast）
- **接收者**：监听消息（onMsg）
- **消息**：传递的信息（消息名称）

**类比**：
- 就像学校的广播系统
- 校长（发送者）通过广播说话
- 所有教室（接收者）都能听到
- 广播内容就是"消息"

**消息的特点**：

1. **广播性**：
   ```go
   broadcast "hello"
   ```
   - 消息发送给**所有对象**
   - 不是只发给某一个对象
   - 所有监听这个消息的对象都会收到

2. **异步性**：
   ```go
   broadcast "hello"
   // 这行代码立即执行完
   // 不等待接收者处理完消息
   ```

3. **事件驱动**：
   ```go
   onMsg "hello", => {
       // 只有收到消息才执行
   }
   ```
   - 接收者被动等待
   - 消息到达时自动触发

**broadcast 命令**

**语法**：
```go
broadcast "消息名称"
```

**示例**：
```go
broadcast "start"      // 广播"开始"消息
broadcast "gameOver"   // 广播"游戏结束"消息
broadcast "collect"    // 广播"收集"消息
broadcast "hello"      // 广播"问候"消息
```

**特点**：
- 立即发送
- 不等待响应
- 可以在任何地方调用

**onMsg 事件处理器**

**语法**：
```go
onMsg "消息名称", => {
    // 处理代码
}
```

**示例**：
```go
// 监听"开始"消息
onMsg "start", => {
    step 100
}

// 监听"停止"消息
onMsg "stop", => {
    // 停止移动
}

// 监听"跳跃"消息
onMsg "jump", => {
    // 执行跳跃
}
```

**特点**：
- 可以监听多个不同的消息
- 每个消息可以有不同的处理逻辑
- 可以在多个精灵中监听同一个消息

#### say 命令

**基本用法**：

```go
say "要说的话"
```

**带时间的用法**：
```go
say "要说的话", 秒数
```

**示例**：
```go
say "你好"              // 一直显示
say "你好", 2           // 显示2秒
say "再见", 1           // 显示1秒
say ""                  // 清除文字（显示空文字）
```

**say 的特点**：

1. **显示位置**：
   - 文字气泡出现在精灵头顶
   - 自动跟随精灵移动

2. **覆盖规则**：
   ```go
   say "第一句"
   say "第二句"  // 覆盖第一句
   ```

3. **清除文字**：
   ```go
   say ""  // 显示空文字，相当于清除
   ```

#### wait 命令

**语法**：
```go
wait 秒数
```

**示例**：
```go
wait 1     // 等待1秒
wait 2     // 等待2秒
wait 0.5   // 等待0.5秒（半秒）
wait 3.5   // 等待3.5秒
```

**wait 的作用**：

1. **创造节奏**：
   ```go
   say "第一句"
   wait 2
   say "第二句"
   wait 2
   say "第三句"
   ```

2. **延迟执行**：
   ```go
   broadcast "start"
   wait 1
   broadcast "go"  // 1秒后再广播
   ```

3. **同步时间**：
   ```go
   step 100
   wait 1
   turn Right
   ```

**wait 会阻塞**：
```go
say "开始等待"
wait 3           // 程序暂停3秒
say "等待结束"   // 3秒后才执行这行
```

#### 本节重点

| 概念 | 说明 | 示例 |
|------|------|------|
| `broadcast` | 广播消息 | `broadcast "hello"` |
| `onMsg` | 监听消息 | `onMsg "hello", => {}` |
| 消息名称 | 消息的标识 | `"hello"`, `"start"` |
| `say` | 显示文字 | `say "你好"` |
| `wait` | 等待 | `wait 1` |
| 发布-订阅 | 通信模式 | 发送者和接收者解耦 |
| 事件驱动 | 响应模式 | 被动响应事件 |

#### 恭喜你！

你现在已经掌握了：
- 使用 `broadcast` 发送消息
- 使用 `onMsg` 接收消息
- 使用 `say` 显示对话
- 使用 `wait` 控制时间
- 理解发布-订阅模式
- 实现精灵间的通信
- 创建对话系统

你已经能够让多个精灵协作完成复杂的任务了！

---

**下一节预告**：我们已经学会了很多编程技巧，但代码变得越来越长。如果有很多重复的代码怎么办？下一章将学习**函数定义**，让你能够组织和重用代码，让程序更简洁、更强大！

#### 9.2.2 练习：章节练习

综合练习跨文件编程技巧：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-51/sprites/Kiko/code

**练习内容：**
运用跨文件编程技术完成复杂的多精灵协作任务。
