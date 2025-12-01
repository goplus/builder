
## 第八章：事件 - 响应用户操作

事件让我们的游戏可以响应用户的操作。

### 8.1 键盘事件

![Course-41](./assets/事件-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-41/sprites/Kiko/code

```xgo
onKey KeyRight, => {
    step 10
}
```

**命令解释：**
- `onKey KeyRight, => {}`: 键盘事件处理器，当用户按下右箭头键时执行花括号内的代码
- `KeyRight`: 右箭头键的键码常量
- `step 10`: 让精灵朝当前方向前进10步

### 8.2 方向控制

![Course-42](./assets/事件-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-42/sprites/Kiko/code

```xgo
onKey KeyRight, => {
    setHeading Right
    step 20
}

onKey KeyLeft, => {
    setHeading Left
    step 20
}
```

**命令解释：**
- `onKey KeyRight, => {}`: 当用户按下右箭头键时的事件处理器
- `setHeading Right`: 设置精灵的朝向为向右
- `step 20`: 让精灵朝当前方向前进20步
- `onKey KeyLeft, => {}`: 当用户按下左箭头键时的事件处理器
- `setHeading Left`: 设置精灵的朝向为向左

### 8.3 完整的方向控制

![Course-43](./assets/事件-3.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-43/sprites/Kiko/code

```xgo
onKey KeyRight, => {
    if heading != Right {
        setHeading Right
    }
    step 20
}

onKey KeyLeft, => {
    if heading != Left {
        setHeading Left
    }
    step 20
}

onKey KeyUp, => {
    if heading != Up {
        setHeading Up
    }
    step 20
}

onKey KeyDown, => {
    if heading != Down {
        setHeading Down
    }
    step 20
}
```

**命令解释：**
- `onKey KeyRight, => {}`: 当用户按下右箭头键时的事件处理器
- `if heading != Right`: 如果精灵的当前朝向不是向右
- `heading`: 精灵当前的朝向属性
- `setHeading Right`: 设置精灵的朝向为向右
- `Right`: 向右方向的常量
- `onKey KeyUp, => {}`: 当用户按下上箭头键时的事件处理器
- `Up`: 向上方向的常量
- `onKey KeyDown, => {}`: 当用户按下下箭头键时的事件处理器
- `Down`: 向下方向的常量

### 8.4 方向控制和点击事件

通过上下左右箭头键控制方向，按Q键种植萝卜，按W键浇水：

![Course-44](./assets/事件-4.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-44/sprites/Kiko/code

```xgo
var (
    radishs []Radish
)

onKey KeyRight, => {
    if heading != Right {
        setHeading Right
    }
    step 20
}

onKey KeyLeft, => {
    if heading != Left {
        setHeading Left
    }
    step 20
}

onKey KeyUp, => {
    if heading != Up {
        setHeading Up
    }
    step 20
}

onKey KeyDown, => {
    if heading != Down {
        setHeading Down
    }
    step 20
}

onKey KeyQ, => {
    // 找一个 离Kiko 最近的可以种萝卜的地方
    rad, ok := farm.findPlot(xpos, ypos)
    if ok {
        turnTo rad
        step distanceTo(rad)-20
        rad.show
        radishs = append(radishs, rad)
    }
}

onKey KeyW, => {
    // 找一个离 Kiko 最近的萝卜
    rad, ok := farm.findPlant(xpos, ypos)
    if ok && !rad.IsMature() {
        turnTo rad
        step distanceTo(rad)-20
        rad.Water()
        animateAndWait "浇水"
        animate "默认", true
    }
}
```

**命令解释：**
- `var (radishs []Radish)`: 定义一个全局的Radish类型数组变量，用于存储种植的萝卜
- `onKey KeyRight, => {}`: 当用户按下右箭头键时的事件处理器
- `onKey KeyLeft, => {}`: 当用户按下左箭头键时的事件处理器
- `onKey KeyUp, => {}`: 当用户按下上箭头键时的事件处理器
- `onKey KeyDown, => {}`: 当用户按下下箭头键时的事件处理器
- `if heading != Right`: 如果精灵的当前朝向不是向右
- `setHeading Right`: 设置精灵的朝向为向右
- `step 20`: 让精灵朝当前方向前进20步
- `onKey KeyQ, => {}`: 当用户按下Q键时的事件处理器（种植功能）
- `rad, ok := farm.findPlot(xpos, ypos)`: 调用farm对象的findPlot方法，根据Kiko的当前坐标查找最近的可种植地块
- `xpos, ypos`: 精灵当前的X和Y坐标位置
- `if ok`: 如果找到了可种植的地块
- `turnTo rad`: 让精灵转向找到的种植位置
- `step distanceTo(rad)-20`: 让精灵前进到距离种植位置20步的地方
- `distanceTo(rad)`: 函数，计算精灵到种植位置的距离
- `rad.show`: 显示萝卜对象（让种植的萝卜可见）
- `radishs = append(radishs, rad)`: 将新种植的萝卜对象添加到数组中
- `append(radishs, rad)`: 函数，向数组中添加新元素
- `onKey KeyW, => {}`: 当用户按下W键时的事件处理器（浇水功能）
- `rad, ok := farm.findPlant(xpos, ypos)`: 调用farm对象的findPlant方法，查找最近的已种植萝卜
- `ok && !rad.IsMature()`: 如果找到萝卜且萝卜没有成熟（!表示逻辑非）
- `rad.Water()`: 调用萝卜对象的浇水方法
- `animateAndWait "浇水"`: 播放"浇水"动画并等待动画完成
- `animate "默认", true`: 播放"默认"动画并循环播放

#### 8.4.1 练习：事件章节练习1

练习事件处理的基础应用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-45/sprites/Kiko/code

**练习内容：**
综合运用键盘事件和方向控制完成交互式游戏任务。

#### 8.4.2 练习：事件章节练习2

进阶事件处理练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-46/sprites/Kiko/code

**练习内容：**
掌握复杂事件组合和多种交互方式的实现技巧。
