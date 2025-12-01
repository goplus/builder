## 第五章：函数调用 - 使用内置功能

XBuilder提供了许多内置函数来帮助我们编写游戏。命令与函数区别：
- 命令：参数可以使用括号括起来，也可以不需要，默认不需要
- 函数：参数必须使用括号括起来。

### 5.1 距离计算

使用 `distanceTo` 函数可以计算到目标对象的距离：

![Course-30-1](./assets/函数调用-1.png)
> 课程地址：https://x.qiniu.com/project/curator/Coding-Course-30-1

```xgo
onStart => {
    var n = distanceTo(萝卜)
    step n
}
```

**命令解释：**
- `var n = distanceTo(萝卜)`: 定义变量n，并将精灵到"萝卜"对象的距离赋值给n
- `distanceTo(萝卜)`: 函数，计算精灵到指定对象"萝卜"的距离
- `step n`: 让精灵朝当前方向前进n步

#### 5.1.1 练习：距离计算

练习使用距离计算函数：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-30-4/sprites/Kiko/code

**练习内容：**
掌握如何使用 `distanceTo` 函数计算精灵到目标对象的距离。

### 5.2 随机数生成

使用 `rand` 函数可以生成随机数：

![Course-30-2](./assets/函数调用-1.png)
> 课程地址：https://x.qiniu.com/project/curator/Coding-Course-30-2

```xgo
onStart => {
    var x = rand(10, 20)
    step x
    var n = distanceTo(萝卜1)
    step n
}
```

**命令解释：**
- `var x = rand(10, 20)`: 定义变量x，并将10到20之间的随机数赋值给x
- `rand(10, 20)`: 函数，生成10到20之间的随机数
- `step x`: 让精灵朝当前方向前进x步
- `var n = distanceTo(萝卜1)`: 定义变量n，并将精灵到"萝卜1"对象的距离赋值给n
- `distanceTo(萝卜1)`: 函数，计算精灵到指定对象"萝卜1"的距离
- `step n`: 让精灵朝当前方向前进n步

#### 5.2.1 练习：随机数生成

练习使用随机数生成函数：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-30-5/sprites/Kiko/code

**练习内容：**
掌握如何使用 `rand` 函数生成随机数并应用到游戏中。
