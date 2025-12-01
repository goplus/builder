
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

#### 6.2.1 练习：遍历数组1

练习遍历数组的使用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-17/sprites/Kiko/code

**练习内容：**
掌握如何使用 `for...in` 循环遍历数组中的所有元素。

#### 6.2.2 练习：遍历数组2

进阶遍历数组练习：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-30/sprites/Kiko/code

**练习内容：**
在更复杂的场景中运用数组遍历技巧。
