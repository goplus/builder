
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
- `var n int = 3`: 定义一个名为n的整数变量，并赋值为3
- `repeat n, => {}`: 使用变量n作为循环次数，重复执行花括号内的代码n次（3次）
- `turn -60`: 让精灵向左转60度
- `step 100`: 让精灵朝当前方向前进100步

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
- `var stepN float64 = 100`: 定义一个名为stepN的浮点数变量，并赋值为100
- `repeat 3, => {}`: 重复执行花括号内的代码3次
- `turn Left`: 让精灵向左转90度
- `step stepN`: 使用变量stepN作为步进距离，让精灵前进100步

#### 4.3.1 练习：定义循环体变量1

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
- `step x`: 让精灵朝当前方向前进x步（第一次是145步）
- `step -x`: 让精灵向后退x步（负数表示后退）
- `turn Left`: 让精灵向左转90度
- `step 161`: 让精灵朝当前方向前进161步
- `x = x + 70`: 将变量x的值增加70，每次循环后x都会变大（145→215→285）

#### 4.4.1 练习：变量章节课后练习1

综合练习变量的使用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-23/sprites/Kiko/code

**练习内容：**
运用变量知识完成更复杂的编程任务。

#### 4.4.2 练习：变量章节课后练习2

进阶变量练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-24/sprites/Kiko/code

**练习内容：**
掌握变量在不同场景下的应用技巧。
