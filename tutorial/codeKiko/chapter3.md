
## 第三章：循环 - 重复执行代码

循环让我们可以重复执行相同的代码，避免写重复的语句。

### 3.1 基础循环

使用 `repeat` 可以重复执行代码块：

![Course-15](./assets/循环-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-15/sprites/Kiko/code

```xgo
onStart => {
    repeat 5, => {
        turn -60
        step 100
    }
}
```

**命令解释：**
- `repeat 5, => {}`: 重复执行花括号内的代码5次
- `turn -60`: 让精灵向左转60度
- `step 100`: 让精灵朝当前方向前进100步

#### 3.1.1 练习：基础循环 1

基础循环练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-14/sprites/Kiko/code

**练习内容：**
通过 `repeat` 创建简单的重复模式。

#### 3.1.2 练习：基础循环 2

进阶循环练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-16/sprites/Kiko/code

**练习内容：**
掌握更复杂的循环结构和嵌套。

### 3.2 带停止条件的循环

我们可以在循环中使用条件判断，xpos 代表精灵的 x 轴坐标：

![Course-28](./assets/循环-3.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-28/sprites/Kiko/code

```xgo
onStart => {
    repeatUntil xpos > 80, => {
        step 10
    }
}
```

**命令解释：**
- `repeatUntil xpos > 80, => {}`: 重复执行花括号内的代码，直到条件"xpos > 80"为真时停止
- `xpos`: 精灵当前的X坐标位置
- `step 10`: 让精灵朝当前方向前进10步

### 3.3 无循环体的条件等待

学习使用 `waitUntil` 进行条件等待：

![Course-29](./assets/循环-4.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-29/sprites/Kiko/code

```xgo
onStart => {
    waitUntil 萝卜.mature
    turnTo 萝卜
    stepTo 萝卜
}
```

**命令解释：**
- `waitUntil 萝卜.mature`: 等待直到萝卜对象的mature属性为真（成熟）
- `萝卜.mature`: 访问萝卜对象的mature属性，表示萝卜是否成熟
- `turnTo 萝卜`: 等待结束后，让精灵转向萝卜对象
- `stepTo 萝卜`: 让精灵移动到萝卜对象位置
