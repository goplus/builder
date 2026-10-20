# API Reference 搜索关键词清单

- **清单有什么**：列出每条 API，以及能搜到它的中英文关键词和同义词。
- **搜索怎么匹配**：英文不区分大小写；多个词用空格分隔，匹配其中任意一个即可。只搜索当前精灵或舞台可用的 API。
- **表格怎么看**：“功能词示例”是可以拿来试搜的词；“补充关键词（完整）”是全部已配置的别名。

## 事件

| API / 写法 | 适用对象 | 中文功能词示例 | 英文功能词示例 | 补充关键词（完整） |
| --- | --- | --- | --- | --- |
| `onStart`：`onStart => {}` | 精灵、舞台 | `开始运行`、`游戏启动`、`开始游戏`、`初始化` | `when game starts`、`start event`、`initialize` | `开始运行`、`游戏启动`、`开始游戏`、`初始化`、`when game starts`、`start event`、`initialize` |
| `onClick`：`onClick => {}` | 精灵 | `点击事件`、`鼠标点击`、`被点击`、`点击角色` | `click event`、`when clicked`、`mouse click`、`click sprite` | `点击事件`、`鼠标点击`、`被点击`、`click event`、`when clicked`、`mouse click`、`点击角色`、`点击精灵`、`click sprite`、`click character` |
| `onKey`：`onKey key, => {}` | 精灵、舞台 | `按下按键`、`按键事件`、`键盘事件`、`按空格` | `key down`、`key press event`、`press space` | `按下按键`、`按键事件`、`键盘事件`、`按空格`、`key down`、`key press event`、`press space` |
| `onSwipe`：`onSwipe direction, => {}` | 精灵、舞台 | `手势`、`滑动手势`、`划屏` | `swipe gesture`、`swipe event` | `手势`、`滑动手势`、`划屏`、`swipe gesture`、`swipe event` |
| `onTouchStart`：`onTouchStart name, sprite => {}` | 精灵 | `碰撞`、`碰到`、`碰撞事件`、`碰到角色时` | `collision`、`collide`、`collision event`、`when touching` | `碰撞`、`碰到`、`碰撞事件`、`collision`、`collide`、`碰到角色时`、`开始接触`、`collision event`、`when touching`、`on collision` |
| `onTouchStart`：`onTouchStart names, sprite => {}` | 精灵 | `碰撞`、`碰到`、`碰撞事件`、`碰到角色时` | `collision`、`collide`、`collision event`、`when touching` | `碰撞`、`碰到`、`碰撞事件`、`collision`、`collide`、`碰到角色时`、`开始接触`、`collision event`、`when touching`、`on collision` |
| `onClick`：`onClick => {}` | 舞台 | `点击事件`、`鼠标点击`、`被点击`、`点击舞台` | `click event`、`when clicked`、`mouse click`、`click stage` | `点击事件`、`鼠标点击`、`被点击`、`click event`、`when clicked`、`mouse click`、`点击舞台`、`点击背景`、`click stage`、`click background` |
| `broadcast`：`broadcast msg` | 精灵、舞台 | `发消息`、`发送消息`、`广播消息`、`通知角色` | `send message`、`broadcast message` | `发消息`、`发送消息`、`广播消息`、`通知角色`、`send message`、`broadcast message` |
| `broadcastAndWait`：`broadcastAndWait msg` | 精灵、舞台 | `发消息并等待`、`广播并等待`、`等待广播完成` | `send message and wait`、`broadcast and wait` | `发消息并等待`、`广播并等待`、`等待广播完成`、`send message and wait`、`broadcast and wait` |
| `onMsg`：`onMsg msg, => {}` | 精灵、舞台 | `收到消息`、`接收消息`、`收到广播`、`接收广播` | `receive message`、`message received` | `收到消息`、`接收消息`、`收到广播`、`接收广播`、`receive message`、`message received` |
| `onCloned`：`onCloned data => {}` | 精灵 | `克隆`、`克隆事件`、`当被克隆`、`复制出来时` | `duplicate`、`when cloned`、`clone event` | `克隆`、`克隆事件`、`duplicate`、`when cloned`、`当被克隆`、`复制出来时`、`clone event` |
| `onBackdrop`：`onBackdrop name, => {}` | 精灵、舞台 | `背景切换事件`、`换背景时`、`场景切换事件` | `when backdrop changes`、`scene change event` | `背景切换事件`、`换背景时`、`场景切换事件`、`when backdrop changes`、`scene change event` |

## 外观

| API / 写法 | 适用对象 | 中文功能词示例 | 英文功能词示例 | 补充关键词（完整） |
| --- | --- | --- | --- | --- |
| `visible` | 精灵 | `显示状态`、`是否可见`、`是否隐藏` | `is visible`、`visibility` | `显示状态`、`是否可见`、`是否隐藏`、`is visible`、`visibility` |
| `show` | 精灵 | `显示角色`、`显示精灵`、`出现`、`现身` | `show sprite`、`show character`、`appear` | `显示角色`、`显示精灵`、`出现`、`现身`、`show sprite`、`show character`、`appear` |
| `hide` | 精灵 | `隐藏角色`、`隐藏精灵`、`消失`、`隐身` | `hide sprite`、`hide character`、`disappear` | `隐藏角色`、`隐藏精灵`、`消失`、`隐身`、`hide sprite`、`hide character`、`disappear` |
| `setLayer`：`setLayer layer` | 精灵 | `图层`、`层级`、`遮挡顺序`、`叠放顺序` | `layer`、`stacking order`、`draw order`、`bring to front` | `图层`、`层级`、`遮挡顺序`、`叠放顺序`、`layer`、`stacking order`、`draw order`、`置顶`、`置底`、`移到最前`、`移到最后`、`bring to front`、`send to back` |
| `setLayer`：`setLayer direction, layers` | 精灵 | `图层`、`层级`、`遮挡顺序`、`叠放顺序` | `layer`、`stacking order`、`draw order`、`bring forward` | `图层`、`层级`、`遮挡顺序`、`叠放顺序`、`layer`、`stacking order`、`draw order`、`上移一层`、`下移一层`、`前移图层`、`后移图层`、`bring forward`、`send backward` |
| `Front` | 精灵、舞台 | `最前层`、`置顶`、`最上层` | `front layer`、`top layer`、`bring to front` | `最前层`、`置顶`、`最上层`、`front layer`、`top layer`、`bring to front` |
| `Back` | 精灵、舞台 | `最后层`、`置底`、`最底层` | `back layer`、`bottom layer`、`send to back` | `最后层`、`置底`、`最底层`、`back layer`、`bottom layer`、`send to back` |
| `Forward` | 精灵、舞台 | `图层上移`、`上一层`、`前移一层` | `layer forward`、`bring forward` | `图层上移`、`上一层`、`前移一层`、`layer forward`、`bring forward` |
| `Backward` | 精灵、舞台 | `图层下移`、`下一层`、`后移一层` | `layer backward`、`send backward` | `图层下移`、`下一层`、`后移一层`、`layer backward`、`send backward` |
| `say`：`say word` | 精灵 | `讲话`、`聊天`、`对话`、`对白` | `speak`、`talk`、`speech bubble`、`say something` | `讲话`、`聊天`、`对话`、`对白`、`说一句话`、`说话气泡`、`speak`、`talk`、`speech bubble`、`say something` |
| `say`：`say word, seconds` | 精灵 | `讲话`、`聊天`、`对话`、`对白` | `speak`、`talk`、`speech bubble`、`say something` | `讲话`、`聊天`、`对话`、`对白`、`说一句话`、`说话气泡`、`speak`、`talk`、`speech bubble`、`say something` |
| `think`：`think word` | 精灵 | `想法`、`想一想`、`思考气泡`、`心里想` | `thought`、`thinking bubble`、`think something` | `想法`、`想一想`、`思考气泡`、`心里想`、`thought`、`thinking bubble`、`think something` |
| `think`：`think word, seconds` | 精灵 | `想法`、`想一想`、`思考气泡`、`心里想` | `thought`、`thinking bubble`、`think something` | `想法`、`想一想`、`思考气泡`、`心里想`、`thought`、`thinking bubble`、`think something` |
| `costumeName` | 精灵 | `服装`、`衣服`、`装扮`、`造型` | `costumes`、`clothes`、`clothing`、`outfit` | `服装`、`衣服`、`装扮`、`costumes`、`clothes`、`clothing`、`outfit`、`造型`、`服装名字`、`当前服装`、`衣服名称`、`costume name`、`current outfit` |
| `setCostume`：`setCostume name` | 精灵 | `服装`、`衣服`、`装扮`、`换装` | `costumes`、`clothes`、`clothing`、`outfit` | `服装`、`衣服`、`装扮`、`costumes`、`clothes`、`clothing`、`outfit`、`换装`、`换服装`、`更换服装`、`换衣服`、`change clothes`、`change costume`、`切换造型`、`换造型`、`切换服装`、`更换衣服`、`switch costume`、`change outfit`、`dress up` |
| `animate`：`animate name` | 精灵 | `动画`、`播放动画`、`动作动画` | `play animation`、`animate sprite` | `动画`、`播放动画`、`动作动画`、`play animation`、`animate sprite` |
| `animate`：`animate name, loop` | 精灵 | `动画`、`播放动画`、`动作动画`、`循环动画` | `play animation`、`animate sprite`、`loop animation`、`repeat animation` | `play animation`、`动画`、`播放动画`、`动作动画`、`animate sprite`、`循环动画`、`重复播放动画`、`loop animation`、`repeat animation` |
| `animateAndWait`：`animateAndWait name` | 精灵 | `播放动画并等待`、`等动画播完` | `play animation and wait`、`wait for animation` | `播放动画并等待`、`等动画播完`、`play animation and wait`、`wait for animation` |
| `stopAnimation`：`stopAnimation name` | 精灵 | `停止动画`、`停下动画`、`结束动画` | `stop animation`、`end animation` | `停止动画`、`停下动画`、`结束动画`、`stop animation`、`end animation` |
| `backdropName` | 精灵、舞台 | `背景`、`场景`、`背景图`、`当前背景` | `background`、`scene`、`backdrop name` | `背景`、`场景`、`背景图`、`当前背景`、`背景名字`、`background`、`scene`、`backdrop name` |
| `backdropIndex` | 精灵、舞台 | `背景编号`、`背景序号`、`第几个背景`、`场景编号` | `background index`、`scene number` | `背景编号`、`背景序号`、`第几个背景`、`场景编号`、`background index`、`scene number` |
| `setBackdrop`：`setBackdrop name` | 精灵、舞台 | `换背景`、`更换背景`、`切换场景`、`换场景` | `change background`、`switch scene` | `换背景`、`更换背景`、`切换场景`、`换场景`、`背景图`、`change background`、`switch scene` |
| `setBackdrop`：`setBackdrop action` | 精灵、舞台 | `换背景`、`更换背景`、`切换场景`、`换场景` | `change background`、`switch scene`、`next background`、`previous background` | `换背景`、`更换背景`、`切换场景`、`换场景`、`背景图`、`change background`、`switch scene`、`下一个背景`、`上一个背景`、`下一个场景`、`next background`、`previous background` |
| `setBackdropAndWait`：`setBackdropAndWait name` | 精灵、舞台 | `换背景并等待`、`切换场景并等待` | `change background and wait`、`switch scene and wait` | `换背景并等待`、`切换场景并等待`、`change background and wait`、`switch scene and wait` |
| `changeGraphicEffect`：`changeGraphicEffect kind, value` | 精灵、舞台 | `调整特效`、`视觉效果`、`变色`、`亮度` | `change effect`、`visual effect`、`color effect`、`brightness` | `调整特效`、`视觉效果`、`变色`、`亮度`、`鱼眼`、`马赛克`、`像素化`、`change effect`、`visual effect`、`color effect`、`brightness`、`mosaic`、`pixelate` |
| `setGraphicEffect`：`setGraphicEffect kind, value` | 精灵、舞台 | `视觉效果`、`颜色特效`、`变色`、`亮度` | `visual effect`、`color effect`、`brightness`、`mosaic` | `视觉效果`、`颜色特效`、`变色`、`亮度`、`鱼眼`、`马赛克`、`像素化`、`visual effect`、`color effect`、`brightness`、`mosaic`、`pixelate` |
| `clearGraphicEffects` | 精灵、舞台 | `清除特效`、`取消特效`、`还原特效`、`恢复原样` | `clear effects`、`reset effects`、`remove effects` | `清除特效`、`取消特效`、`还原特效`、`恢复原样`、`clear effects`、`reset effects`、`remove effects` |

## 运动

| API / 写法 | 适用对象 | 中文功能词示例 | 英文功能词示例 | 补充关键词（完整） |
| --- | --- | --- | --- | --- |
| `xpos` | 精灵 | `横坐标`、`水平位置`、`角色位置`、`x坐标` | `x position`、`horizontal position` | `横坐标`、`水平位置`、`角色位置`、`x坐标`、`x position`、`horizontal position` |
| `ypos` | 精灵 | `纵坐标`、`垂直位置`、`角色位置`、`y坐标` | `y position`、`vertical position` | `纵坐标`、`垂直位置`、`角色位置`、`y坐标`、`y position`、`vertical position` |
| `step`：`step distance` | 精灵 | `移动`、`前进`、`往前走`、`走路` | `move`、`move forward`、`walk` | `移动`、`move`、`前进`、`往前走`、`走路`、`行走`、`move forward`、`walk` |
| `step`：`step distance, speed` | 精灵 | `移动`、`前进`、`往前走`、`走路` | `move`、`move forward`、`walk` | `移动`、`move`、`前进`、`往前走`、`走路`、`行走`、`move forward`、`walk` |
| `stepTo`：`stepTo sprite` | 精灵 | `移动`、`走到`、`走向`、`移动到` | `move`、`move to`、`go to`、`walk to` | `移动`、`move`、`走到`、`走向`、`移动到`、`走到指定位置`、`走到角色`、`move to`、`go to`、`walk to` |
| `stepTo`：`stepTo x, y` | 精灵 | `移动`、`走到`、`走向`、`移动到` | `move`、`move to`、`go to`、`walk to` | `移动`、`move`、`走到`、`走向`、`移动到`、`走到指定位置`、`走到角色`、`move to`、`go to`、`walk to` |
| `stepTo`：`stepTo sprite, speed` | 精灵 | `移动`、`走到`、`走向`、`移动到` | `move`、`move to`、`go to`、`walk to` | `移动`、`move`、`走到`、`走向`、`移动到`、`走到指定位置`、`走到角色`、`move to`、`go to`、`walk to` |
| `stepTo`：`stepTo x, y, speed` | 精灵 | `移动`、`走到`、`走向`、`移动到` | `move`、`move to`、`go to`、`walk to` | `移动`、`move`、`走到`、`走向`、`移动到`、`走到指定位置`、`走到角色`、`move to`、`go to`、`walk to` |
| `glide`：`glide x, y, seconds` | 精灵 | `移动`、`滑动`、`滑行`、`平滑移动` | `move`、`slide`、`smooth move`、`glide to` | `移动`、`move`、`滑动`、`滑行`、`平滑移动`、`移动到`、`滑到`、`slide`、`smooth move`、`glide to` |
| `glide`：`glide sprite, seconds` | 精灵 | `移动`、`滑动`、`滑行`、`平滑移动` | `move`、`slide`、`smooth move`、`glide to` | `移动`、`move`、`滑动`、`滑行`、`平滑移动`、`移动到`、`滑到`、`slide`、`smooth move`、`glide to` |
| `glide`：`glide object, seconds` | 精灵 | `移动`、`滑动`、`滑行`、`平滑移动` | `move`、`slide`、`smooth move`、`glide to` | `移动`、`move`、`滑动`、`滑行`、`平滑移动`、`移动到`、`滑到`、`slide`、`smooth move`、`glide to` |
| `changeXpos`：`changeXpos dX` | 精灵 | `改变横坐标`、`水平移动`、`左右移动`、`向左移动` | `move horizontally`、`move left`、`move right` | `改变横坐标`、`水平移动`、`左右移动`、`向左移动`、`向右移动`、`move horizontally`、`move left`、`move right` |
| `setXpos`：`setXpos x` | 精灵 | `设置横坐标`、`水平位置`、`左右移动`、`x坐标` | `set x`、`horizontal position`、`move horizontally` | `设置横坐标`、`水平位置`、`左右移动`、`x坐标`、`set x`、`horizontal position`、`move horizontally` |
| `changeYpos`：`changeYpos dY` | 精灵 | `改变纵坐标`、`垂直移动`、`上下移动`、`向上移动` | `move vertically`、`move up`、`move down` | `改变纵坐标`、`垂直移动`、`上下移动`、`向上移动`、`向下移动`、`move vertically`、`move up`、`move down` |
| `setYpos`：`setYpos y` | 精灵 | `设置纵坐标`、`垂直位置`、`上下移动`、`y坐标` | `set y`、`vertical position`、`move vertically` | `设置纵坐标`、`垂直位置`、`上下移动`、`y坐标`、`set y`、`vertical position`、`move vertically` |
| `heading` | 精灵 | `朝向`、`方向`、`旋转角度`、`当前角度` | `direction`、`rotation angle`、`heading` | `朝向`、`方向`、`旋转角度`、`当前角度`、`direction`、`rotation angle`、`heading` |
| `turn`：`turn direction` | 精灵 | `转弯`、`转动`、`左转`、`右转` | `rotate`、`turn left`、`turn right` | `转弯`、`转动`、`左转`、`右转`、`旋转`、`rotate`、`turn left`、`turn right` |
| `turn`：`turn direction, speed` | 精灵 | `转弯`、`转动`、`左转`、`右转` | `rotate`、`turn left`、`turn right` | `转弯`、`转动`、`左转`、`右转`、`旋转`、`rotate`、`turn left`、`turn right` |
| `turnTo`：`turnTo sprite` | 精灵 | `面向角色`、`朝向角色`、`转向角色`、`看向角色` | `face sprite`、`point towards sprite`、`turn towards` | `面向角色`、`朝向角色`、`转向角色`、`看向角色`、`face sprite`、`point towards sprite`、`turn towards` |
| `turnTo`：`turnTo sprite, speed` | 精灵 | `面向角色`、`朝向角色`、`转向角色`、`看向角色` | `face sprite`、`point towards sprite`、`turn towards` | `面向角色`、`朝向角色`、`转向角色`、`看向角色`、`face sprite`、`point towards sprite`、`turn towards` |
| `changeHeading`：`changeHeading degree` | 精灵 | `改变方向`、`调整角度`、`转动角度`、`旋转角度` | `change direction`、`rotate by`、`change angle` | `改变方向`、`调整角度`、`转动角度`、`旋转角度`、`change direction`、`rotate by`、`change angle` |
| `setHeading`：`setHeading direction` | 精灵 | `设置方向`、`设置角度`、`面向方向`、`朝哪个方向` | `set direction`、`point in direction`、`set angle` | `设置方向`、`设置角度`、`面向方向`、`朝哪个方向`、`set direction`、`point in direction`、`set angle` |
| `Up` | 精灵、舞台 | `向上`、`上方`、`上方向` | `up`、`upward` | `向上`、`上方`、`上方向`、`up`、`upward` |
| `Down` | 精灵、舞台 | `向下`、`下方`、`下方向` | `down`、`downward` | `向下`、`下方`、`下方向`、`down`、`downward` |
| `Left` | 精灵、舞台 | `向左`、`左边`、`左方向` | `left`、`leftward` | `向左`、`左边`、`左方向`、`left`、`leftward` |
| `Right` | 精灵、舞台 | `向右`、`右边`、`右方向` | `right`、`rightward` | `向右`、`右边`、`右方向`、`right`、`rightward` |
| `size` | 精灵 | `大小`、`尺寸`、`缩放比例`、`角色大小` | `sprite size`、`scale` | `大小`、`尺寸`、`缩放比例`、`角色大小`、`sprite size`、`scale` |
| `changeSize`：`changeSize dSize` | 精灵 | `放大`、`缩小`、`变大`、`变小` | `resize`、`change scale`、`grow`、`shrink` | `放大`、`缩小`、`变大`、`变小`、`调整大小`、`resize`、`change scale`、`grow`、`shrink` |
| `setSize`：`setSize size` | 精灵 | `放大`、`缩小`、`变大`、`变小` | `resize`、`scale`、`grow`、`shrink` | `放大`、`缩小`、`变大`、`变小`、`设置大小`、`缩放`、`resize`、`scale`、`grow`、`shrink` |
| `setRotationStyle`：`setRotationStyle style` | 精灵 | `旋转方式`、`旋转模式`、`翻转方式` | `rotation style`、`rotation mode`、`flip style` | `旋转方式`、`旋转模式`、`翻转方式`、`rotation style`、`rotation mode`、`flip style` |
| `None` | 精灵、舞台 | `不旋转`、`禁止旋转`、`固定朝向` | `no rotation`、`do not rotate` | `不旋转`、`禁止旋转`、`固定朝向`、`no rotation`、`do not rotate` |
| `Normal` | 精灵、舞台 | `自由旋转`、`正常旋转`、`任意旋转` | `free rotation`、`all around rotation` | `自由旋转`、`正常旋转`、`任意旋转`、`free rotation`、`all around rotation` |
| `LeftRight` | 精灵、舞台 | `左右翻转`、`水平翻转`、`镜像翻转` | `flip horizontally`、`left right flip`、`mirror` | `左右翻转`、`水平翻转`、`镜像翻转`、`flip horizontally`、`left right flip`、`mirror` |
| `physicsMode` | 精灵 | `物理`、`物理模式`、`物理效果` | `physics`、`physics mode` | `物理`、`物理模式`、`物理效果`、`physics`、`physics mode` |
| `velocity` | 精灵 | `运动速度`、`物理速度`、`水平速度`、`垂直速度` | `velocity`、`physics velocity`、`movement speed` | `运动速度`、`物理速度`、`水平速度`、`垂直速度`、`velocity`、`physics velocity`、`movement speed` |
| `gravity` | 精灵 | `重力`、`重力大小`、`重力加速度` | `gravity`、`gravitational acceleration` | `重力`、`重力大小`、`重力加速度`、`gravity`、`gravitational acceleration` |
| `isOnFloor` | 精灵 | `是否落地`、`是否着地`、`在地面上`、`地面检测` | `on ground`、`grounded`、`is on floor` | `是否落地`、`是否着地`、`在地面上`、`地面检测`、`on ground`、`grounded`、`is on floor` |
| `setPhysicsMode`：`setPhysicsMode mode` | 精灵 | `物理`、`设置物理模式`、`开启物理`、`关闭物理` | `physics`、`enable physics`、`disable physics` | `物理`、`设置物理模式`、`开启物理`、`关闭物理`、`physics`、`enable physics`、`disable physics` |
| `setVelocity`：`setVelocity vx, vy` | 精灵 | `设置速度`、`运动速度`、`水平速度`、`垂直速度` | `set velocity`、`set speed`、`fall speed` | `设置速度`、`运动速度`、`水平速度`、`垂直速度`、`下落速度`、`set velocity`、`set speed`、`fall speed` |
| `setGravity`：`setGravity g` | 精灵 | `设置重力`、`调整重力`、`重力加速度` | `set gravity`、`change gravity` | `设置重力`、`调整重力`、`重力加速度`、`set gravity`、`change gravity` |
| `addImpulse`：`addImpulse ix, iy` | 精灵 | `冲量`、`推一下`、`瞬间加速`、`跳跃` | `impulse`、`push`、`jump`、`instant velocity change` | `冲量`、`推一下`、`瞬间加速`、`跳跃`、`起跳`、`impulse`、`push`、`jump`、`instant velocity change` |
| `bounceOffEdge` | 精灵 | `碰到边缘反弹`、`碰边反弹`、`碰墙反弹`、`边界反弹` | `bounce on edge`、`bounce off wall` | `碰到边缘反弹`、`碰边反弹`、`碰墙反弹`、`边界反弹`、`bounce on edge`、`bounce off wall` |

## 控制

| API / 写法 | 适用对象 | 中文功能词示例 | 英文功能词示例 | 补充关键词（完整） |
| --- | --- | --- | --- | --- |
| `wait`：`wait seconds` | 精灵、舞台 | `等一会`、`等一下`、`延时`、`延迟` | `delay`、`pause`、`wait a second` | `等一会`、`等一下`、`延时`、`延迟`、`暂停一会`、`等待一秒`、`delay`、`pause`、`wait a second` |
| `waitUntil`：`waitUntil condition` | 精灵、舞台 | `等到`、`等待条件`、`满足条件再继续`、`条件等待` | `wait until`、`wait for condition` | `等到`、`等待条件`、`满足条件再继续`、`条件等待`、`wait until`、`wait for condition` |
| `timer` | 精灵、舞台 | `计时`、`秒表`、`运行时间`、`已经过了多久` | `elapsed time`、`stopwatch`、`timer` | `计时`、`秒表`、`运行时间`、`已经过了多久`、`elapsed time`、`stopwatch`、`timer` |
| `resetTimer` | 精灵、舞台 | `重新计时`、`计时清零`、`重置秒表` | `reset timer`、`restart timer`、`reset stopwatch` | `重新计时`、`计时清零`、`重置秒表`、`reset timer`、`restart timer`、`reset stopwatch` |
| `forever`：`forever => {}` | 精灵、舞台 | `循环`、`无限循环`、`一直重复`、`一直执行` | `loop`、`forever loop`、`infinite loop` | `循环`、`无限循环`、`一直重复`、`一直执行`、`永远重复`、`loop`、`forever loop`、`infinite loop` |
| `repeat`：`repeat times, => {}` | 精灵、舞台 | `循环`、`重复几次`、`循环次数`、`重复指定次数` | `loop`、`repeat loop`、`repeat times`、`counted loop` | `循环`、`重复几次`、`循环次数`、`重复指定次数`、`loop`、`repeat loop`、`repeat times`、`counted loop` |
| `repeatUntil`：`repeatUntil condition, => {}` | 精灵、舞台 | `循环`、`循环直到`、`重复直到`、`满足条件停止` | `loop until`、`repeat until`、`conditional loop` | `循环`、`循环直到`、`重复直到`、`满足条件停止`、`loop until`、`repeat until`、`conditional loop` |
| `for_iterate`：`for v in arr {}` | 精灵、舞台 | `数组`、`遍历数组`、`列表`、`遍历列表` | `array`、`iterate array`、`loop array`、`list` | `array`、`iterate array`、`loop array`、`数组`、`遍历数组`、`列表`、`遍历列表`、`循环数组`、`每一项`、`list`、`for each` |
| `if_statement`：`if condition {}` | 精灵、舞台 | `如果`、`判断`、`条件判断`、`满足条件执行` | `if`、`condition`、`conditional`、`check condition` | `如果`、`判断`、`条件判断`、`满足条件执行`、`if`、`condition`、`conditional`、`check condition` |
| `if_else_statement`：`if condition {} else {}` | 精灵、舞台 | `如果否则`、`判断`、`条件判断`、`否则` | `if else`、`otherwise`、`conditional branch` | `如果否则`、`判断`、`条件判断`、`否则`、`不然`、`if else`、`otherwise`、`conditional branch` |

## 感知

| API / 写法 | 适用对象 | 中文功能词示例 | 英文功能词示例 | 补充关键词（完整） |
| --- | --- | --- | --- | --- |
| `touching`：`touching(sprite)` | 精灵 | `碰撞`、`碰到`、`碰撞检测`、`是否接触` | `collision`、`collide`、`touching`、`is touching` | `碰撞`、`碰到`、`碰撞检测`、`collision`、`collide`、`是否接触`、`是否碰到`、`touching`、`is touching` |
| `touching`：`touching(object)` | 精灵 | `碰撞`、`碰到`、`碰撞检测`、`是否接触` | `collision`、`collide`、`touching`、`is touching` | `碰撞`、`碰到`、`碰撞检测`、`collision`、`collide`、`是否接触`、`是否碰到`、`touching`、`is touching` |
| `distanceTo`：`distanceTo(sprite)` | 精灵 | `距离`、`间距`、`测距`、`相隔多远` | `distance`、`how far`、`distance between` | `距离`、`间距`、`测距`、`相隔多远`、`distance`、`how far`、`distance between` |
| `distanceTo`：`distanceTo(object)` | 精灵 | `距离`、`间距`、`测距`、`相隔多远` | `distance`、`how far`、`distance between` | `距离`、`间距`、`测距`、`相隔多远`、`distance`、`how far`、`distance between` |
| `Edge` | 精灵、舞台 | `边界`、`屏幕边缘`、`舞台边缘` | `edge`、`screen border`、`stage boundary` | `边界`、`屏幕边缘`、`舞台边缘`、`edge`、`screen border`、`stage boundary` |
| `EdgeBottom` | 精灵、舞台 | `下边界`、`底边`、`屏幕下边缘` | `bottom edge`、`bottom border` | `下边界`、`底边`、`屏幕下边缘`、`bottom edge`、`bottom border` |
| `EdgeLeft` | 精灵、舞台 | `左边界`、`左边缘`、`屏幕左边缘` | `left edge`、`left border` | `左边界`、`左边缘`、`屏幕左边缘`、`left edge`、`left border` |
| `EdgeRight` | 精灵、舞台 | `右边界`、`右边缘`、`屏幕右边缘` | `right edge`、`right border` | `右边界`、`右边缘`、`屏幕右边缘`、`right edge`、`right border` |
| `EdgeTop` | 精灵、舞台 | `上边界`、`顶边`、`屏幕上边缘` | `top edge`、`top border` | `上边界`、`顶边`、`屏幕上边缘`、`top edge`、`top border` |
| `mouseX` | 精灵、舞台 | `鼠标横坐标`、`鼠标水平位置`、`鼠标位置` | `mouse x`、`mouse position`、`cursor x` | `鼠标横坐标`、`鼠标水平位置`、`鼠标位置`、`mouse x`、`mouse position`、`cursor x` |
| `mouseY` | 精灵、舞台 | `鼠标纵坐标`、`鼠标垂直位置`、`鼠标位置` | `mouse y`、`mouse position`、`cursor y` | `鼠标纵坐标`、`鼠标垂直位置`、`鼠标位置`、`mouse y`、`mouse position`、`cursor y` |
| `Mouse` | 精灵、舞台 | `鼠标`、`鼠标指针`、`光标` | `mouse`、`cursor`、`mouse pointer` | `鼠标`、`鼠标指针`、`光标`、`mouse`、`cursor`、`mouse pointer` |
| `keyPressed`：`keyPressed(key)` | 精灵、舞台 | `按住按键`、`是否按住`、`按键检测`、`键盘检测` | `key held`、`is key pressed`、`hold key` | `按住按键`、`是否按住`、`按键检测`、`键盘检测`、`key held`、`is key pressed`、`hold key` |
| `ask`：`ask question` | 精灵、舞台 | `提问`、`问问题`、`询问`、`输入文字` | `ask question`、`user input`、`text input` | `提问`、`问问题`、`询问`、`输入文字`、`玩家输入`、`ask question`、`user input`、`text input` |
| `answer` | 精灵、舞台 | `回答内容`、`输入内容`、`玩家回答`、`输入的文字` | `player answer`、`input text`、`user response` | `回答内容`、`输入内容`、`玩家回答`、`输入的文字`、`player answer`、`input text`、`user response` |

## 声音

| API / 写法 | 适用对象 | 中文功能词示例 | 英文功能词示例 | 补充关键词（完整） |
| --- | --- | --- | --- | --- |
| `stopAllSounds` | 精灵、舞台 | `停止所有音乐`、`停止全部声音`、`全部停止播放` | `stop all music`、`stop all audio` | `停止所有音乐`、`停止全部声音`、`全部停止播放`、`stop all music`、`stop all audio` |
| `play`：`play sound` | 精灵、舞台 | `播放音乐`、`播放音效`、`背景音乐`、`背景音` | `play music`、`play audio`、`background music`、`bgm` | `播放音乐`、`播放音效`、`背景音乐`、`背景音`、`配乐`、`play music`、`play audio`、`background music`、`bgm`、`sound effect` |
| `play`：`play sound, loop` | 精灵、舞台 | `播放音乐`、`播放音效`、`背景音乐`、`背景音` | `play music`、`play audio`、`background music`、`bgm` | `播放音乐`、`播放音效`、`背景音乐`、`背景音`、`配乐`、`play music`、`play audio`、`background music`、`bgm`、`sound effect`、`循环播放声音`、`循环音乐`、`重复播放声音`、`loop music`、`loop sound`、`repeat sound` |
| `playAndWait`：`playAndWait sound` | 精灵、舞台 | `播放音乐并等待`、`等声音播完`、`背景音乐` | `play music and wait`、`wait for sound`、`background music`、`bgm` | `播放音乐并等待`、`等声音播完`、`背景音乐`、`play music and wait`、`wait for sound`、`background music`、`bgm` |
| `pausePlaying`：`pausePlaying sound` | 精灵、舞台 | `暂停音乐`、`暂停播放`、`暂停音效` | `pause music`、`pause audio`、`pause playback` | `暂停音乐`、`暂停播放`、`暂停音效`、`pause music`、`pause audio`、`pause playback` |
| `resumePlaying`：`resume sound` | 精灵、舞台 | `继续播放`、`恢复播放`、`继续音乐`、`恢复音乐` | `resume music`、`resume playback`、`continue playing` | `继续播放`、`恢复播放`、`继续音乐`、`恢复音乐`、`resume music`、`resume playback`、`continue playing` |
| `stopPlaying`：`stop sound` | 精灵、舞台 | `停止音乐`、`停止播放`、`停止音效` | `stop music`、`stop audio`、`stop playback` | `停止音乐`、`停止播放`、`停止音效`、`stop music`、`stop audio`、`stop playback` |
| `volume` | 精灵、舞台 | `音量`、`响度`、`声音大小`、`音乐音量` | `volume`、`loudness`、`sound level` | `音量`、`响度`、`声音大小`、`音乐音量`、`volume`、`loudness`、`sound level` |
| `changeVolume`：`changeVolume dVolume` | 精灵、舞台 | `调整音量`、`声音大小`、`调大声音`、`调小声音` | `change volume`、`louder`、`quieter` | `调整音量`、`声音大小`、`调大声音`、`调小声音`、`增大音量`、`减小音量`、`change volume`、`louder`、`quieter` |
| `setVolume`：`setVolume volume` | 精灵、舞台 | `设置音量`、`声音大小`、`调大声音`、`调小声音` | `set volume`、`louder`、`quieter`、`mute` | `设置音量`、`声音大小`、`调大声音`、`调小声音`、`静音`、`set volume`、`louder`、`quieter`、`mute` |

## 游戏

| API / 写法 | 适用对象 | 中文功能词示例 | 英文功能词示例 | 补充关键词（完整） |
| --- | --- | --- | --- | --- |
| `clone` | 精灵 | `克隆`、`复制角色`、`复制精灵`、`分身` | `duplicate`、`copy sprite`、`clone character` | `克隆`、`复制角色`、`duplicate`、`copy sprite`、`复制精灵`、`分身`、`clone character` |
| `die` | 精灵 | `删除角色`、`删除精灵`、`移除角色`、`销毁` | `delete sprite`、`remove sprite`、`destroy sprite` | `删除角色`、`删除精灵`、`移除角色`、`销毁`、`死亡`、`delete sprite`、`remove sprite`、`destroy sprite` |
| `Camera.zoom` | 精灵、舞台 | `镜头缩放`、`摄像机缩放`、`镜头比例` | `camera zoom`、`zoom level` | `镜头缩放`、`摄像机缩放`、`镜头比例`、`camera zoom`、`zoom level` |
| `Camera.setZoom`：`Camera.setZoom zoom` | 精灵、舞台 | `镜头放大`、`镜头缩小`、`摄像机缩放`、`拉近镜头` | `camera zoom`、`zoom in`、`zoom out` | `镜头放大`、`镜头缩小`、`摄像机缩放`、`拉近镜头`、`拉远镜头`、`camera zoom`、`zoom in`、`zoom out` |
| `Camera.xpos` | 精灵、舞台 | `镜头横坐标`、`摄像机水平位置` | `camera x`、`camera horizontal position` | `镜头横坐标`、`摄像机水平位置`、`camera x`、`camera horizontal position` |
| `Camera.ypos` | 精灵、舞台 | `镜头纵坐标`、`摄像机垂直位置` | `camera y`、`camera vertical position` | `镜头纵坐标`、`摄像机垂直位置`、`camera y`、`camera vertical position` |
| `Camera.setXYpos`：`Camera.setXYpos x, y` | 精灵、舞台 | `移动镜头`、`镜头位置`、`移动摄像机` | `move camera`、`camera position`、`pan camera` | `移动镜头`、`镜头位置`、`移动摄像机`、`move camera`、`camera position`、`pan camera` |
| `Camera.follow`：`Camera.follow sprite` | 精灵、舞台 | `镜头跟随`、`摄像机跟随`、`跟随角色` | `camera follow`、`follow sprite`、`follow character` | `镜头跟随`、`摄像机跟随`、`跟随角色`、`camera follow`、`follow sprite`、`follow character` |
| `println`：`println msg, ...` | 精灵、舞台 | `打印`、`输出`、`打印文字`、`调试输出` | `print`、`console`、`debug output`、`log` | `打印`、`输出`、`打印文字`、`调试输出`、`控制台`、`print`、`console`、`debug output`、`log` |
| `rand`：`rand(from, to)` | 精灵、舞台 | `随机`、`随机数`、`随机取值`、`随机整数` | `random`、`random number`、`random value`、`random integer` | `随机`、`随机数`、`随机取值`、`random`、`random number`、`random value`、`随机整数`、`random integer` |
| `rand`：`rand(from, to)` | 精灵、舞台 | `随机`、`随机数`、`随机取值` | `random`、`random number`、`random value` | `随机`、`随机数`、`随机取值`、`random`、`random number`、`random value` |
| `exit` | 精灵、舞台 | `结束游戏`、`停止游戏`、`退出游戏` | `end game`、`stop game`、`quit game` | `结束游戏`、`停止游戏`、`退出游戏`、`end game`、`stop game`、`quit game` |
| `getWidget`：`getWidget(T, name)` | 精灵、舞台 | `控件`、`界面组件`、`获取控件`、`查找控件` | `widget`、`ui element`、`find widget` | `控件`、`界面组件`、`获取控件`、`查找控件`、`widget`、`ui element`、`find widget` |

## 核对范围

以上关键词、API 名称和原始写法已逐条通过实际搜索函数核对。舞台与精灵的点击事件分别支持“点击舞台”和“点击角色”；循环播放的关键词对应循环写法。

来源：[Reference 条目及对象过滤](../../spx-gui/src/components/editor/spx-code-editor/api-reference/index.ts)、[常用关键词](../../spx-gui/src/components/editor/spx-code-editor/api-reference/search-keywords.ts)、[API 说明与已有同义词](../../spx-gui/src/components/editor/spx-code-editor/document-base/index.ts)、[语法说明](../../spx-gui/src/components/xgo-code-editor/document-base/xgo.ts)、[搜索匹配规则](../../spx-gui/src/components/xgo-code-editor/ui/api-reference/search.ts)。
