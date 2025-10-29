# XBuilder游戏编程教材

## 目录

- [XBuilder游戏编程教材](#xbuilder游戏编程教材)
  - [目录](#目录)
  - [第一章：初步 - 基础动作](#第一章初步---基础动作)
    - [1.1 第一个程序](#11-第一个程序)
    - [1.2 修改步数](#12-修改步数)
    - [1.3 转向与步进](#13-转向与步进)
    - [1.4 使用转向绕过障碍](#14-使用转向绕过障碍)
    - [练习：绕过障碍物](#练习绕过障碍物)
    - [1.5 使用数字作为参数转向](#15-使用数字作为参数转向)
    - [1.6 更复杂的路径](#16-更复杂的路径)
  - [第二章：对象 - 与游戏对象交互](#第二章对象---与游戏对象交互)
    - [2.1 转向对象](#21-转向对象)
    - [练习：转向对象](#练习转向对象)
    - [2.2 朝对象步进](#22-朝对象步进)
    - [2.3 更复杂的路径](#23-更复杂的路径)
    - [2.4 基于对象的转向与步进](#24-基于对象的转向与步进)
    - [练习：基于对象的转向与步进](#练习基于对象的转向与步进)
  - [第三章：循环 - 重复执行代码](#第三章循环---重复执行代码)
    - [3.1 基础循环](#31-基础循环)
    - [练习：基础循环 1](#练习基础循环-1)
    - [练习：基础循环 2](#练习基础循环-2)
    - [3.2 带停止条件的循环](#32-带停止条件的循环)
    - [3.3 无循环体的条件等待](#33-无循环体的条件等待)
  - [第四章：变量 - 存储和使用数据](#第四章变量---存储和使用数据)
    - [4.1 定义和使用变量](#41-定义和使用变量)
    - [4.2 定义循环次数变量](#42-定义循环次数变量)
    - [4.3 定义循环体变量](#43-定义循环体变量)
    - [练习：定义循环体变量1](#练习定义循环体变量1)
    - [4.4 在循环中修改变量](#44-在循环中修改变量)
    - [练习：变量章节课后练习1](#练习变量章节课后练习1)
    - [练习：变量章节课后练习2](#练习变量章节课后练习2)
  - [综合1：往期章节综合练习](#综合1往期章节综合练习)
    - [综合练习1](#综合练习1)
    - [综合练习2](#综合练习2)
  - [第五章：函数调用 - 使用内置功能](#第五章函数调用---使用内置功能)
    - [5.1 距离计算](#51-距离计算)
    - [练习：距离计算](#练习距离计算)
    - [5.2 随机数生成](#52-随机数生成)
    - [练习：随机数生成](#练习随机数生成)
  - [第六章：数组 - 管理多个对象](#第六章数组---管理多个对象)
    - [6.1 通过索引访问元素](#61-通过索引访问元素)
    - [6.2 遍历数组](#62-遍历数组)
    - [练习：遍历数组1](#练习遍历数组1)
    - [练习：遍历数组2](#练习遍历数组2)
  - [第七章：条件 - 根据情况做决定](#第七章条件---根据情况做决定)
    - [7.1 简单条件](#71-简单条件)
    - [7.2 条件与循环结合](#72-条件与循环结合)
    - [练习：条件与循环结合1](#练习条件与循环结合1)
    - [练习：条件与循环结合2](#练习条件与循环结合2)
    - [7.3 复杂条件处理](#73-复杂条件处理)
    - [练习：复杂条件处理](#练习复杂条件处理)
  - [综合2：往期章节综合练习](#综合2往期章节综合练习)
    - [综合练习1](#综合练习1-1)
    - [综合练习2](#综合练习2-1)
    - [综合练习3](#综合练习3)
    - [综合练习4](#综合练习4)
  - [第八章：事件 - 响应用户操作](#第八章事件---响应用户操作)
    - [8.1 键盘事件](#81-键盘事件)
    - [8.2 方向控制](#82-方向控制)
    - [8.3 完整的方向控制](#83-完整的方向控制)
    - [8.4 方向控制和点击事件](#84-方向控制和点击事件)
    - [练习：事件章节练习1](#练习事件章节练习1)
    - [练习：事件章节练习2](#练习事件章节练习2)
  - [第九章：跨文件编程 - 多个精灵协同工作](#第九章跨文件编程---多个精灵协同工作)
    - [9.1 精灵文件结构](#91-精灵文件结构)
    - [练习：精灵文件结构](#练习精灵文件结构)
    - [9.2 跨文件通信：broadcast \& onMsg](#92-跨文件通信broadcast--onmsg)
    - [练习：跨文件通信练习题](#练习跨文件通信练习题)
    - [练习：章节练习](#练习章节练习)
  - [第十章：函数定义与调用 - 组织代码](#第十章函数定义与调用---组织代码)
    - [10.1 定义函数](#101-定义函数)
    - [10.2 使用函数](#102-使用函数)
    - [10.3 多角色公用函数](#103-多角色公用函数)
    - [练习：函数定义与调用练习](#练习函数定义与调用练习)
  - [综合1：游戏制作综合练习](#综合1游戏制作综合练习)
  - [综合2：高级游戏开发](#综合2高级游戏开发)
  - [综合3：最终大型游戏](#综合3最终大型游戏)

---

## 第一章：初步 - 基础动作

在这一章中，我们将学习最基本的精灵动作：转向和步进。

### 1.1 第一个程序

让我们从最简单的开始。点击"运行"按钮，看看会发生什么：

- **onStart**: 游戏开始时执行的事件处理器

![Course-1](./assets/初步-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-1/sprites/Kiko/code

```xgo
onStart => {
    step 160
}
```

**命令解释：**
- `step 160`: 让精灵朝当前方向前进160步

### 1.2 修改步数

现在试试修改步数参数，比如改成200：
![Course-2](./assets/初步-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-2/sprites/Kiko/code

```xgo
onStart => {
    step 160
}
```

修改为：

```xgo
onStart => {
    step 200
}
```

**命令解释：**
- `step 200`: 让精灵朝当前方向前进200步

### 1.3 转向与步进

当精灵没有朝向萝卜时，需要先转向，并修改步数参数，为160：
![Course-3](./assets/初步-3.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-3/sprites/Kiko/code

```xgo
onStart => {
    turn Right
	step 120
}
```

修改为：

```xgo
onStart => {
    turn Right
	step 160
}
```

**命令解释：**
- `turn Right`: 让精灵向右转90度
- `step 160`: 让精灵朝当前方向前进160步

### 1.4 使用转向绕过障碍

当遇到障碍物时，我们可以通过转向来绕过，以下例子，需要再添加向左，并向前走 160 步：

![Course-4](./assets/初步-4.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-4/sprites/Kiko/code

```xgo
onStart => {
	turn Right
	step 190
}
```

修改为：

```xgo
onStart => {
	turn Right
	step 190
    turn Left
    step 160
}
```

**命令解释：**
- `turn Right`: 让精灵向右转90度
- `step 190`: 让精灵朝当前方向前进190步
- `turn Left`: 让精灵向左转90度
- `step 160`: 让精灵朝当前方向前进160步

### 练习：绕过障碍物

练习绕过障碍物的技巧：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-5/sprites/Kiko/code

**练习内容：**
通过组合 `turn` 和 `step` 命令，让精灵成功绕过障碍物到达目标。

### 1.5 使用数字作为参数转向

除了使用方向常量，我们也可以用数字表示角度，以下例子，需要将 -30 改为 -45：

![Course-6](./assets/初步-6.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-6/sprites/Kiko/code

```xgo
onStart => {
	turn -30
	step 300
}
```

修改为：

```xgo
onStart => {
	turn -45
	step 300
}
```

**命令解释：**
- `turn -45`: 让精灵向左转45度（负数表示向左转）
- `step 300`: 让精灵朝当前方向前进300步

### 1.6 更复杂的路径

现在让我们创建一个更复杂的移动路径：

![Course-7](./assets/初步-7.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-7/sprites/Kiko/code

```xgo
onStart => {
    turn Right
    step 180
    turn Left
    step 200
    turn Left
    step 180
}
```

**命令解释：**
- `turn Right`: 让精灵向右转90度
- `step 180`: 让精灵朝当前方向前进180步
- `turn Left`: 让精灵向左转90度
- `step 200`: 让精灵朝当前方向前进200步
- `turn Left`: 再次让精灵向左转90度
- `step 180`: 让精灵朝当前方向前进180步

## 第二章：对象 - 与游戏对象交互

在这一章中，我们将学习如何与游戏中的其他对象进行交互。

### 2.1 转向对象

使用 `turnTo` 可以让精灵面向指定的对象：

![Course-8](./assets/对象-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-8/sprites/Kiko/code

```xgo
onStart => {
	turnTo 萝卜
	step 200
}
```

**命令解释：**
- `turnTo 萝卜`: 让精灵转向名为"萝卜"的对象
- `step 200`: 让精灵朝当前方向前进200步

### 练习：转向对象

练习使用 `turnTo` 命令：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-9/sprites/Kiko/code

**练习内容：**
掌握如何让精灵准确转向指定对象。

### 2.2 朝对象步进

`turnTo` 让精灵转向目标对象，`stepTo` 让精灵走向目标对象。这比手动计算角度和距离要简单得多。以下例子，需要在 stepTo 前，增加 turnTo 转向 

![Course-10](./assets/对象-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-10/sprites/Kiko/code

```xgo
onStart => {
	stepTo 萝卜
}
```

修改为：

```xgo
onStart => {
    turnTo 萝卜
	stepTo 萝卜
}
```

**命令解释：**
- `turnTo 萝卜`: 让精灵转向名为"萝卜"的对象
- `stepTo 萝卜`: 让精灵移动到名为"萝卜"的对象位置

### 2.3 更复杂的路径

通过组合多个 `turnTo`，`stepTo` 让精灵走向多个目标对象。

![Course-11](./assets/对象-3.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-11/sprites/Kiko/code

```
onStart => {
	turnTo 萝卜1
	stepTo 萝卜1
}
```

修改为：

```
onStart => {
	turnTo 萝卜1
	stepTo 萝卜1

    turnTo 萝卜2
	stepTo 萝卜2

    turnTo 萝卜3
	stepTo 萝卜3
}
```

**命令解释：**
- `turnTo 萝卜1`: 让精灵转向名为"萝卜1"的对象
- `stepTo 萝卜1`: 让精灵移动到名为"萝卜1"的对象位置
- `turnTo 萝卜2`: 让精灵转向名为"萝卜2"的对象
- `stepTo 萝卜2`: 让精灵移动到名为"萝卜2"的对象位置
- `turnTo 萝卜3`: 让精灵转向名为"萝卜3"的对象
- `stepTo 萝卜3`: 让精灵移动到名为"萝卜3"的对象位置

### 2.4 基于对象的转向与步进

学习更高级的对象交互技巧：

![Course-12](./assets/对象-4.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-12/sprites/Kiko/code

**命令解释：**
结合使用 `turnTo` 和 `stepTo` 实现复杂的移动路径。

### 练习：基于对象的转向与步进

综合练习对象交互：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-13/sprites/Kiko/code

**练习内容：**
掌握如何灵活使用对象交互命令实现复杂的移动模式。

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

### 练习：基础循环 1

基础循环练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-14/sprites/Kiko/code

**练习内容：**
通过 `repeat` 创建简单的重复模式。

### 练习：基础循环 2

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
- `waitUntil xpos > 200`: 等待直到 x 坐标大于 200
- `say "到达目标位置！"`: 显示文字消息

## 第四章：变量 - 存储和使用数据

变量就像是一个盒子，可以存储数据供我们使用。

### 4.1 定义和使用变量

![Course-19](./assets/变量-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-19/sprites/Kiko/code

```xgo
onStart => {
	var x float64 = 100
	step x
}
```

需求改为：

```xgo
onStart => {
	var x float64 = 160
	step x
}
```

**命令解释：**
- `var x float64 = 160`: 定义一个名为x的浮点数变量，并赋值为160
- `step x`: 让精灵朝当前方向前进x步（即160步）

### 4.2 定义循环次数变量

学习定义控制循环次数的变量：

![Course-20](./assets/变量-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-20/sprites/Kiko/code

```xgo
onStart => {
	var n int = 3
	repeat n, => {
		turn -60
		step 100
	}
}
```

**命令解释：**
- `var count int = 5`: 定义一个名为count的整数变量，并赋值为5
- `repeat count, => {}`: 使用变量count作为循环次数

### 4.3 定义循环体变量

学习在循环体中使用变量：

![Course-21](./assets/变量-3.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-21/sprites/Kiko/code

```xgo
onStart => {
	var stepN float64 = 100
	repeat 3, => {
		turn Left
		step stepN
	}
}
```

**命令解释：**
- `var stepSize int = 100`: 定义步长变量
- `step stepSize`: 使用变量作为步进距离

### 练习：定义循环体变量1

进一步练习在循环体中使用变量：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-22/sprites/Kiko/code

**练习内容：**
掌握在循环体中灵活使用变量控制精灵行为。

### 4.4 在循环中修改变量

学习在循环过程中动态修改变量的值：

![Course-25](./assets/变量-4.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-25/sprites/Kiko/code

```xgo
onStart => {
    var x float64 = 145

    repeat 3, => {
        turn Right
        step x
        step -x
        turn Left
        step 161
        x = x + 10
    }
}
```

需求改为：

```xgo
onStart => {
    var x float64 = 145

    repeat 3, => {
        turn Right
        step x
        step -x
        turn Left
        step 161
        x = x + 70
    }
}
```

每次循环，`x` 的值都会增加70，使得步数逐渐增大。

**命令解释：**
- `var x float64 = 145`: 定义一个名为x的浮点数变量，并赋值为145
- `repeat 3, => {}`: 重复执行花括号内的代码3次
- `turn Right`: 让精灵向右转90度
- `step x`: 让精灵朝当前方向前进x步
- `step -x`: 让精灵向后退x步（负数表示后退）
- `turn Left`: 让精灵向左转90度
- `step 161`: 让精灵朝当前方向前进161步
- `x = x + 70`: 将变量x的值增加70

### 练习：变量章节课后练习1

综合练习变量的使用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-23/sprites/Kiko/code

**练习内容：**
运用变量知识完成更复杂的编程任务。

### 练习：变量章节课后练习2

进阶变量练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-24/sprites/Kiko/code

**练习内容：**
掌握变量在不同场景下的应用技巧。

## 综合1：往期章节综合练习

通过综合练习巩固前面章节学到的知识：

### 综合练习1

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-26/sprites/Kiko/code

综合运用基础动作、对象交互、循环和变量知识完成复杂任务。

### 综合练习2

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-27/sprites/Kiko/code

进一步练习多种编程概念的组合使用。

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

### 练习：距离计算

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

### 练习：随机数生成

练习使用随机数生成函数：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-30-5/sprites/Kiko/code

**练习内容：**
掌握如何使用 `rand` 函数生成随机数并应用到游戏中。

## 第六章：数组 - 管理多个对象

数组让我们可以存储和管理多个相似的对象。

### 6.1 通过索引访问元素

有三个萝卜，但萝卜2没有成熟，不能采摘，所以需要通过索引访问萝卜1和萝卜3.

![Course-30-3](./assets/数组-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-30-3/sprites/Kiko/code

```xgo
onStart => {
    var radishs = ["萝卜", "萝卜2", "萝卜3"] // 萝卜2 没成熟不能采摘
    turnTo radishs[0]
    stepTo radishs[0]

    turnTo radishs[2]
    stepTo radishs[2]
}
```

数组的索引从0开始，`radishs[0]` 表示第一个元素，`radishs[2]` 表示第三个元素。

**命令解释：**
- `var radishs = ["萝卜", "萝卜2", "萝卜3"]`: 定义一个名为radishs的数组，包含三个字符串元素
- `radishs[0]`: 访问数组中索引为0的元素（即"萝卜"）
- `turnTo radishs[0]`: 让精灵转向数组第一个元素指定的对象
- `stepTo radishs[0]`: 让精灵移动到数组第一个元素指定的对象位置
- `radishs[2]`: 访问数组中索引为2的元素（即"萝卜3"）
- `turnTo radishs[2]`: 让精灵转向数组第三个元素指定的对象
- `stepTo radishs[2]`: 让精灵移动到数组第三个元素指定的对象位置

### 6.2 遍历数组

使用 `for...in` 可以遍历数组：

![Course-18](./assets/循环-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-18/sprites/Kiko/code

```xgo
onStart => {
    for v in ["萝卜1", "萝卜2", "萝卜3"] {
        turnTo v
        stepTo v
    }
}
```

**命令解释：**
- `for v in ["萝卜1", "萝卜2", "萝卜3"]`: 遍历数组中的每个元素，每次将元素赋值给变量v
- `turnTo v`: 让精灵转向当前遍历到的对象
- `stepTo v`: 让精灵移动到当前遍历到的对象位置

### 练习：遍历数组1

练习遍历数组的使用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-17/sprites/Kiko/code

**练习内容：**
掌握如何使用 `for...in` 循环遍历数组中的所有元素。

### 练习：遍历数组2

进阶遍历数组练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-30/sprites/Kiko/code

**练习内容：**
在更复杂的场景中运用数组遍历技巧。

## 第七章：条件 - 根据情况做决定

条件语句让程序可以根据不同情况执行不同的代码。

### 7.1 简单条件

![Course-31](./assets/条件-1.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-31/sprites/Kiko/code

```xgo
onStart => {
    if 萝卜1.IsMature() {
        turnTo 萝卜1
        stepTo 萝卜1
    }
}
```

**命令解释：**
- `if 萝卜1.IsMature()`: 条件语句，如果"萝卜1"对象已经成熟则执行花括号内的代码
- `萝卜1.IsMature()`: 函数调用，检查"萝卜1"对象是否成熟，返回布尔值
- `turnTo 萝卜1`: 让精灵转向"萝卜1"对象
- `stepTo 萝卜1`: 让精灵移动到"萝卜1"对象位置
 
### 7.2 条件与循环结合

![Course-32](./assets/条件-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-32/sprites/Kiko/code

```xgo
onStart => {
    var radishs []Radish = [萝卜1, 萝卜2, 萝卜3]
    for v in radishs {
        if v.IsMature() {
            turnTo v
            stepTo v
        }
    }
}
```

**命令解释：**
- `var radishs []Radish = [萝卜1, 萝卜2, 萝卜3]`: 定义一个Radish类型的数组，包含三个萝卜对象
- `for v in radishs`: 遍历数组中的每个萝卜对象，每次将对象赋值给变量v
- `if v.IsMature()`: 条件语句，如果当前萝卜对象已经成熟则执行花括号内的代码
- `v.IsMature()`: 函数调用，检查当前萝卜对象是否成熟
- `turnTo v`: 让精灵转向当前萝卜对象
- `stepTo v`: 让精灵移动到当前萝卜对象位置

### 练习：条件与循环结合1

练习条件语句与循环的组合使用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-33/sprites/Kiko/code

**练习内容：**
掌握在循环中使用条件判断控制程序流程。

### 练习：条件与循环结合2

进阶条件与循环结合练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-34/sprites/Kiko/code

**练习内容：**
在更复杂的场景中运用条件与循环结合的技巧。

### 7.3 复杂条件处理

![Course-35](./assets/条件-3.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-35/sprites/Kiko/code

```xgo
onStart => {
    var radishs []Radish = [萝卜1, 萝卜2, 萝卜3]
    for v in radishs {
        if v.IsMature() {
            turnTo v
            stepTo v
        } else {
            turnTo v
            step distanceTo(v)-20
            v.Water()
            animateAndWait "浇花"
        }
    }

    for v in radishs {
        waitUntil v.IsMature()
        turnTo v
        stepTo v
    }
}
```

**命令解释：**
- `var radishs []Radish = [萝卜1, 萝卜2, 萝卜3]`: 定义一个Radish类型的数组
- `for v in radishs`: 遍历数组中的每个萝卜对象
- `if v.IsMature()`: 如果萝卜成熟了
- `else`: 否则（如果萝卜没有成熟）
- `turnTo v`: 让精灵转向萝卜对象
- `step distanceTo(v)-20`: 让精灵前进到距离萝卜20步的位置
- `distanceTo(v)`: 函数，计算精灵到萝卜对象的距离
- `v.Water()`: 调用萝卜对象的浇水方法
- `animateAndWait "浇花"`: 播放"浇花"动画并等待动画完成
- `waitUntil v.IsMature()`: 等待直到萝卜对象成熟
- `stepTo v`: 让精灵移动到萝卜对象位置

### 练习：复杂条件处理

练习复杂条件处理的综合应用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-36/sprites/Kiko/code

**练习内容：**
掌握复杂条件判断和多层嵌套逻辑的处理技巧。

## 综合2：往期章节综合练习

通过更复杂的综合练习进一步巩固编程技能：

### 综合练习1

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-37/sprites/Kiko/code

结合变量、循环、条件和函数调用完成复杂编程任务。

### 综合练习2

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-38/sprites/Kiko/code

### 综合练习3

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-39/sprites/Kiko/code

### 综合练习4

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-40/sprites/Kiko/code

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

通过 上下左右 控制方向，点击农场，可以种植萝卜。

![Course-44](./assets/事件-4.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-44/sprites/Kiko/code

```xgo
var (
    radishs []Radish
)

onKey KeyD, => {
    if heading != Right {
        setHeading Right
    }
    step 20
}

onKey KeyA, => {
    if heading != Left {
        setHeading Left
    }
    step 20
}

onKey KeyW, => {
    if heading != Up {
        setHeading Up
    }
    step 20
}

onKey KeyS, => {
    if heading != Down {
        setHeading Down
    }
    step 20
}

farm.onClick => {
    rad, ok := farm.findPlot()
    if ok {
        turnTo rad
        step distanceTo(rad)-20
        rad.show
        radishs = append(radishs, rad)

        rad.onClick => {
            if !rad.IsMature() {
                turnTo rad
                step distanceTo(rad)-20
                rad.Water()
                animateAndWait "浇水"
                animate "默认", true
            }
        }
    }
}
```

**命令解释：**
- `var (radishs []Radish)`: 定义一个全局的Radish类型数组变量
- `onKey KeyD, => {}`: 当用户按下D键时的事件处理器
- `KeyD`, `KeyA`, `KeyW`, `KeyS`: WASD键的键码常量
- `farm.onClick => {}`: 当用户点击farm对象时的事件处理器
- `rad, ok := farm.findPlot()`: 调用farm对象的findPlot方法，返回萝卜对象和布尔值
- `if ok`: 如果找到了可种植的地块
- `rad.show`: 显示萝卜对象
- `radishs = append(radishs, rad)`: 将新萝卜对象添加到数组中
- `append(radishs, rad)`: 函数，向数组中添加新元素
- `rad.onClick => {}`: 为萝卜对象设置点击事件处理器
- `!rad.IsMature()`: 如果萝卜没有成熟（!表示逻辑非）
- `animate "默认", true`: 播放"默认"动画并循环播放

### 练习：事件章节练习1

练习事件处理的基础应用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-45/sprites/Kiko/code

**练习内容：**
综合运用键盘事件和方向控制完成交互式游戏任务。

### 练习：事件章节练习2

进阶事件处理练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-46/sprites/Kiko/code

**练习内容：**
掌握复杂事件组合和多种交互方式的实现技巧。

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

### 练习：精灵文件结构

练习多精灵文件结构的使用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-48/sprites/Kiko/code

**练习内容：**
掌握如何组织和管理多个精灵文件的代码结构。

### 9.2 跨文件通信：broadcast & onMsg

学习不同精灵之间如何传递信息：

![Course-49](./assets/跨文件编程-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-49/sprites/Kiko/code

```xgo
// 舞台代码
var (
	followRole string
)

// Kiko 精灵代码
onStart => {
	say "你好 Jenny"
	broadcast "hello"
}

// Jenny 精灵代码
onMsg "hello", => {
	wait 1
	say "你好 Kiko"
}
```

**命令解释：**
- `broadcast "hello"`: 广播消息给所有精灵
- `onMsg "hello", => {}`: 监听特定消息的事件处理器

### 练习：跨文件通信练习题

练习精灵间通信的实现：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-50/sprites/Kiko/code

**练习内容：**
掌握使用 `broadcast` 和 `onMsg` 实现精灵之间的消息传递。

### 练习：章节练习

综合练习跨文件编程技巧：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-51/sprites/Kiko/code

**练习内容：**
运用跨文件编程技术完成复杂的多精灵协作任务。

## 第十章：函数定义与调用 - 组织代码

函数让我们可以将代码组织成可重用的模块。

### 10.1 定义函数

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-52/sprites/Kiko/code

```xgo
func plant() {
	// 是否站在农田上
	if f, ok := findFarm(xpos, ypos); ok {
		// 找一个 离Kiko 最近的可以种萝卜的地方
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
		// 找一个离 Kiko 最近的萝卜
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
		// 找一个离 Kiko 最近的萝卜
		rad, ok := f.findPlant(xpos, ypos)
		if ok && rad.IsMature() {
			turnTo rad
			stepTo rad
		}
	}
}
```

**命令解释：**
- `func plant() Radish`: 定义一个名为plant的函数，接受两个浮点数参数，返回Radish类型
- `rad := farm.findPlot(x, y)`: 调用farm对象的PlantRadish方法，在指定坐标种植萝卜
- `return rad`: 返回萝卜对象
- `func water()`: 定义一个名为water的函数，无返回值
- `func harvest()`: 定义一个名为harvest的函数

### 10.2 使用函数

```xgo
onKey KeyQ, => {
	plant
}

onKey KeyW, => {
	water
}

onKey KeyE, => {
	harvest
}
```

### 10.3 多角色公用函数

> https://x.qiniu.com/editor/curator/Coding-Course-53/sprites/Kiko/code

```xgo
// 舞台

func moveDir(s Sprite, dir Direction, n float64) {
	if s.name != followRole {
		return
	}
	if s.heading != dir {
		s.setHeading dir
	}
	s.step n
}

func plant(s Sprite) {
	if s.name != followRole {
		return
	}
	// 是否站在农田上
	if f, ok := findFarm(s.xpos, s.ypos); ok {
		// 找一个 离Kiko 最近的可以种萝卜的地方
		rad, ok := f.findPlot(s.xpos, s.ypos)
		if ok {
			s.turnTo rad
			s.step s.distanceTo(rad)-20
			rad.show
		}
	}
}

func water(s Sprite) {
	if s.name != followRole {
		return
	}
	if f, ok := findFarm(s.xpos, s.ypos); ok {
		// 找一个离 Kiko 最近的萝卜
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

func harvest(s Sprite) {
	if s.name != followRole {
		return
	}
	if f, ok := findFarm(s.xpos, s.ypos); ok {
		// 找一个离 Kiko 最近的萝卜
		rad, ok := f.findPlant(s.xpos, s.ypos)
		if ok && rad.IsMature() {
			s.turnTo rad
			s.stepTo rad
		}
	}
}

// Kiko 代码
var (
	radishNeed      int
	radishCollected int
)

radishNeed = 3

onKey KeyRight, => {
	moveDir this, Right, 20
}

onKey KeyLeft, => {
	moveDir this, Left, 20
}

onKey KeyUp, => {
	moveDir this, Up, 20
}

onKey KeyDown, => {
	moveDir this, Down, 20
}

onKey KeyQ, => {
	plant this
}

onKey KeyW, => {
	water this
}

onKey KeyE, => {
	harvest this
}

onClick => {
	followRole = name
}

// Jenny 代码
var (
	radishNeed      int
	radishCollected int
)

radishNeed = 3

onKey KeyRight, => {
	moveDir this, Right, 20
}

onKey KeyLeft, => {
	moveDir this, Left, 20
}

onKey KeyUp, => {
	moveDir this, Up, 20
}

onKey KeyDown, => {
	moveDir this, Down, 20
}

onKey KeyQ, => {
	plant this
}

onKey KeyW, => {
	water this
}

onKey KeyE, => {
	harvest this
}

onClick => {
	followRole = name
}
```

**命令解释：**
- `var radishs []Radish = [萝卜1, 萝卜2, 萝卜3]`: 定义萝卜对象数组
- `for v in radishs`: 遍历萝卜数组
- `if !v.IsMature()`: 如果萝卜没有成熟
- `water(v)`: 调用water函数浇水
- `waitUntil v.IsMature()`: 等待萝卜成熟
- `harvest(v)`: 调用harvest函数收获萝卜

### 练习：函数定义与调用练习

练习函数定义和调用的综合应用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-54/sprites/Kiko/code

**练习内容：**
掌握如何定义和使用函数来组织代码，提高代码的可读性和重用性。

学习不同精灵之间如何传递信息：

![Course-49](./assets/跨文件编程-2.png)
> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-49/sprites/Kiko/code

```xgo
// 舞台代码
var (
	gameScore int
	currentPlayer string
)

// Kiko 精灵代码
onStart => {
	currentPlayer = "Kiko"
	gameScore = gameScore + 10
	broadcast "scoreChanged"
}

// Jenny 精灵代码
onMsg "scoreChanged", => {
	say "当前得分: " + toString(gameScore)
}
```

**练习内容：**
通过广播和消息监听实现多精灵之间的信息交换和协作。

## 综合1：游戏制作综合练习

**练习：综合游戏制作**

**练习内容：**
运用前面学到的编程知识，创建一个综合性的游戏项目。

## 综合2：高级游戏开发

**练习：高级游戏项目**

**练习内容：**
创建更复杂的游戏，运用所有学过的编程概念和技巧。

## 综合3：最终大型游戏

**练习：最终大型游戏项目**

**练习内容：**
运用所有学到的编程知识创建一个大型综合游戏项目。

---

恭喜你完成了 Kiko 编程教程！现在你已经具备了使用 XBuilder 创建精彩游戏和应用的能力。继续练习和探索，创造出属于你自己的作品吧！
