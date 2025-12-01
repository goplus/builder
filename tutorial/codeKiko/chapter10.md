
## 第十章：函数定义与调用 - 组织代码

函数让我们可以将代码组织成可重用的模块，提高代码的可读性和维护性。

### 10.1 定义函数与调用

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-52/sprites/Kiko/code

**函数定义**
```xgo
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

**函数调用**
```xgo
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

**命令解释：**
- `func plant()`: 定义一个名为plant的函数，用于种植萝卜
- `if f, ok := findFarm(xpos, ypos); ok`: 查找当前位置是否有农田，如果找到则执行后续操作
- `findFarm(xpos, ypos)`: 函数调用，根据坐标查找农田对象
- `xpos`, `ypos`: 精灵当前的X和Y坐标
- `rad, ok := f.findPlot(xpos, ypos)`: 在农田中查找可种植的地块
- `turnTo rad`: 让精灵转向萝卜种植位置
- `step distanceTo(rad)-20`: 让精灵移动到距离种植位置20步的地方
- `rad.show`: 显示萝卜对象（让萝卜可见）
- `func water()`: 定义一个名为water的函数，用于给萝卜浇水
- `f.findPlant(xpos, ypos)`: 在农田中查找已种植的萝卜
- `!rad.IsMature()`: 检查萝卜是否未成熟
- `rad.Water()`: 调用萝卜对象的浇水方法
- `animateAndWait "浇水"`: 播放浇水动画并等待完成
- `func harvest()`: 定义一个名为harvest的函数，用于收获萝卜
- `rad.IsMature()`: 检查萝卜是否已经成熟
- `stepTo rad`: 让精灵移动到萝卜位置进行收获
- `onKey KeyQ, => {}`: 当用户按下Q键时的事件处理器
- `plant()`: 调用plant函数执行种植操作
- `onKey KeyW, => {}`: 当用户按下W键时的事件处理器
- `water()`: 调用water函数执行浇水操作
- `onKey KeyE, => {}`: 当用户按下E键时的事件处理器
- `harvest()`: 调用harvest函数执行收获操作

### 10.2 多角色公用函数

```xgo
// 舞台代码
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

**命令解释：**
- `func moveDir(s Sprite, dir Direction, n float64)`: 定义一个通用的移动函数，接受精灵对象、方向和距离作为参数
- `s Sprite`: 参数，表示要移动的精灵对象
- `dir Direction`: 参数，表示移动方向
- `n float64`: 参数，表示移动距离
- `if s.name != followRole`: 如果精灵的名字不等于当前跟随的角色名
- `return`: 直接返回，不执行后续操作
- `s.setHeading dir`: 设置精灵s的朝向为指定方向
- `s.step n`: 让精灵s前进n步
- `func plant(s Sprite)`: 定义一个通用的种植函数，接受精灵对象作为参数
- `s.xpos, s.ypos`: 获取精灵s的坐标位置
- `s.turnTo rad`: 让精灵s转向萝卜位置
- `s.distanceTo(rad)`: 计算精灵s到萝卜的距离

**精灵代码中的调用：**
```xgo
onKey KeyRight, => {
	moveDir this, Right, 20
}

onKey KeyQ, => {
	plant this
}
```

**命令解释：**
- `moveDir this, Right, 20`: 调用moveDir函数，传入当前精灵对象(this)、向右方向(Right)和距离20
- `this`: 代表当前精灵对象本身
- `plant this`: 调用plant函数，传入当前精灵对象(this)作为参数

通过将函数定义在舞台中，多个精灵可以共享相同的功能代码，避免重复编写相同的逻辑。每个精灵只需要调用这些公用函数并传入自己的对象引用(`this`)即可。

这种设计模式的优势：
1. **代码复用**：避免在每个精灵中重复编写相同的功能
2. **统一管理**：所有公用逻辑集中在舞台中，便于维护和修改
3. **参数化**：通过传入不同的精灵对象，同一个函数可以作用于不同的精灵
4. **权限控制**：通过`followRole`变量控制哪个精灵可以执行操作

这样的函数组织方式让代码更加模块化和可维护，是编程中的良好实践。

#### 10.2.1 练习：函数定义与调用练习

练习函数定义和调用的综合应用：

> 课程地址：https://x.qiniu.com/editor/curator/Coding-Course-54/sprites/Kiko/code
