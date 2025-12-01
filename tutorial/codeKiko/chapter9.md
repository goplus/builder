
## 第九章：跨文件编程 - 多个精灵协同工作

在复杂的游戏中，我们需要多个精灵协同工作。

### 9.1 精灵文件结构

![Course-47](./assets/跨文件编程-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-47/sprites/Kiko/code

- Kiko精灵：
```xgo
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

点击 Jenny精灵, 代码编辑器切换到 Jenny 精灵的代码，所有事件都将被绑定到 Jenny 下
- Jenny精灵：
```xgo
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

公用的，全局性质的，比如全局变量，需要定义到舞台中，点击舞台，可以切换到舞台代码

**舞台** - 主程序：
```xgo
var (
    followRole string
)
```

**命令解释：**
- `var (followRole string)`: 在舞台中定义全局字符串变量followRole
- `if followRole == name`: 如果全局变量followRole等于当前精灵的名字
- `name`: 精灵的名字属性
- `onClick => {}`: 当精灵被点击时的事件处理器
- `followRole = name`: 将当前精灵的名字赋值给全局变量followRole

#### 9.1.1 练习：精灵文件结构

练习多精灵文件结构的使用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-48/sprites/Kiko/code

**练习内容：**
掌握如何组织和管理多个精灵文件的代码结构。

### 9.2 跨文件通信：broadcast & onMsg

学习不同精灵之间如何传递信息：

![Course-49](./assets/跨文件编程-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-49/sprites/Kiko/code

**舞台代码：**
```xgo
var (
    followRole string
)
```

**Kiko精灵代码：**
```xgo
onStart => {
    say "你好 Jenny"
    broadcast "hello"
}
```

**Jenny精灵代码：**
```xgo
onMsg "hello", => {
    wait 1
    say "你好 Kiko"
}
```

**命令解释：**
- `var (followRole string)`: 在舞台中定义全局字符串变量followRole
- `say "你好 Jenny"`: 让Kiko精灵显示文字"你好 Jenny"
- `broadcast "hello"`: 广播名为"hello"的消息给游戏中的所有对象
- `onMsg "hello", => {}`: 监听名为"hello"的消息的事件处理器
- `wait 1`: 等待1秒
- `say "你好 Kiko"`: 让Jenny精灵显示文字"你好 Kiko"

#### 9.2.1 练习：跨文件通信练习题

练习精灵间通信的实现：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-50/sprites/Kiko/code

**练习内容：**
掌握使用 `broadcast` 和 `onMsg` 实现精灵之间的消息传递。

#### 9.2.2 练习：章节练习

综合练习跨文件编程技巧：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-51/sprites/Kiko/code

**练习内容：**
运用跨文件编程技术完成复杂的多精灵协作任务。
