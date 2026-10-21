# API Reference 搜索关键词清单建议

- **清单内容**：API 写法、常用中英文关键词和区别说明。
- **搜索规则**：英文不区分大小写；空格分隔的词匹配任意一个即可，范围限当前精灵／舞台。
- **实现状态**：已同步到本地搜索；待讨论内容见文末。

## 事件

| API / 写法 | 适用对象 | 中文关键词建议 | 英文关键词建议 | 含义与区分 |
| --- | --- | --- | --- | --- |
| `onStart`：`onStart => {}` | 精灵、舞台 | `开始`、`开始运行`、`开始游戏`、`游戏开始`、`启动`、`运行时`、`初始化`、`开始时执行`、`游戏启动` | `start`、`game start`、`when game starts`、`on start`、`begin`、`initialize`、`startup`、`start event` | 游戏开始时执行，可放初始化行为。 |
| `onClick`：`onClick => {}` | 精灵 | `点击`、`单击`、`点一下`、`点角色`、`点击精灵`、`角色被点击`、`点击时执行`、`鼠标点击`、`点击事件`、`被点击`、`点击角色` | `click`、`clicked`、`click sprite`、`click character`、`when clicked`、`mouse click`、`tap sprite`、`click event` | 点击当前精灵时执行；与点击舞台区分。 |
| `onKey`：`onKey key, => {}` | 精灵、舞台 | `按键`、`键盘`、`按下`、`按键事件`、`按空格`、`按方向键`、`按键时执行`、`按下按键`、`键盘事件` | `keyboard`、`key press`、`key down`、`when key pressed`、`press space`、`arrow key`、`key event`、`key press event` | 按下指定键时执行；持续按住的状态由 keyPressed 判断。 |
| `onSwipe`：`onSwipe direction, => {}` | 精灵、舞台 | `滑动`、`滑屏`、`划屏`、`手势`、`手指滑动`、`向左滑`、`向右滑`、`滑动时执行`、`滑动手势` | `swipe`、`swipe gesture`、`swipe event`、`swipe left`、`swipe right`、`screen swipe` | 用户进行指定方向的滑动操作时执行。 |
| `onTouchStart`：`onTouchStart name, sprite => {}` | 精灵 | `触碰`、`碰到`、`碰撞`、`接触`、`碰到角色`、`碰到时执行`、`碰撞事件`、`触碰事件`、`碰到角色时`、`开始接触` | `touch`、`contact`、`collision`、`collide`、`when touching`、`on collision`、`touch event`、`collision event` | 与指定名字的一个精灵开始接触时执行。 |
| `onTouchStart`：`onTouchStart names, sprite => {}` | 精灵 | `触碰`、`碰到`、`碰撞`、`接触`、`碰到任意角色`、`多个角色`、`碰到时执行`、`碰撞事件`、`触碰事件`、`碰到角色时`、`开始接触` | `touch`、`contact`、`collision`、`collide`、`touch any sprite`、`multiple sprites`、`on collision`、`collision event`、`when touching` | 与名单中任意一个精灵开始接触时执行；参数是一组名字。 |
| `onClick`：`onClick => {}` | 舞台 | `点击`、`单击`、`点一下`、`点舞台`、`点击背景`、`舞台被点击`、`点击时执行`、`鼠标点击`、`点击事件`、`被点击`、`点击舞台` | `click`、`clicked`、`click stage`、`click background`、`when stage clicked`、`mouse click`、`tap stage`、`click event`、`when clicked` | 点击舞台时执行；与点击精灵区分。 |
| `broadcast`：`broadcast msg` | 精灵、舞台 | `消息`、`广播`、`发消息`、`发送消息`、`发送广播`、`通知`、`通知角色`、`通知其他角色`、`广播消息` | `message`、`broadcast`、`send message`、`broadcast message`、`notify`、`notify sprites` | 发出指定消息；不等待接收方的行为完成。 |
| `broadcastAndWait`：`broadcastAndWait msg` | 精灵、舞台 | `消息`、`广播`、`发消息并等待`、`广播并等待`、`通知并等待`、`等消息处理完`、`等待广播完成` | `message`、`broadcast`、`send message and wait`、`broadcast and wait`、`wait for receivers`、`notify and wait` | 发送消息并等待关联的接收行为完成。 |
| `onMsg`：`onMsg msg, => {}` | 精灵、舞台 | `消息`、`广播`、`收到消息`、`接收消息`、`收到广播`、`接到通知`、`收到消息时执行`、`接收广播` | `message`、`broadcast`、`receive message`、`when message received`、`receive broadcast`、`on message`、`message received` | 收到指定消息时执行；与发送消息区分。 |
| `onCloned`：`onCloned data => {}` | 精灵 | `克隆`、`复制`、`分身`、`被克隆`、`被复制`、`克隆出来时`、`分身创建时`、`克隆事件`、`当被克隆`、`复制出来时` | `clone`、`cloned`、`when cloned`、`clone event`、`duplicate`、`when copy created` | 被复制出的精灵执行此处行为；与创建克隆区分。 |
| `onBackdrop`：`onBackdrop name, => {}` | 精灵、舞台 | `背景`、`场景`、`换背景时`、`背景切换`、`换场景时`、`切换到背景`、`背景切换事件`、`场景切换事件` | `backdrop`、`background`、`scene`、`when backdrop changes`、`scene change`、`on backdrop`、`scene change event` | 切换到指定背景时执行；与主动切换背景区分。 |

## 外观

| API / 写法 | 适用对象 | 中文关键词建议 | 英文关键词建议 | 含义与区分 |
| --- | --- | --- | --- | --- |
| `visible` | 精灵 | `显示`、`隐藏`、`可见`、`是否显示`、`是否可见`、`是否隐藏`、`显示状态`、`看得见吗` | `visible`、`visibility`、`is visible`、`is shown`、`is hidden`、`visibility state` | 读取当前精灵是否可见；不改变显示状态。 |
| `show` | 精灵 | `显示`、`显示角色`、`显示精灵`、`出现`、`现身`、`重新出现`、`显示出来`、`让角色出现` | `show`、`show sprite`、`show character`、`appear`、`make visible`、`show again` | 让当前精灵可见；不创建新精灵。 |
| `hide` | 精灵 | `隐藏`、`隐藏角色`、`隐藏精灵`、`消失`、`隐身`、`藏起来`、`不显示`、`看不见` | `hide`、`hide sprite`、`hide character`、`disappear`、`make invisible`、`invisible` | 让当前精灵不可见；不表示死亡或删除。 |
| `setLayer`：`setLayer layer` | 精灵 | `图层`、`层级`、`前后顺序`、`遮挡`、`叠放顺序`、`置顶`、`置底`、`移到最前`、`移到最后`、`遮挡顺序` | `layer`、`draw order`、`stacking order`、`bring to front`、`send to back`、`frontmost`、`backmost` | 直接放到最前或最后，用 Front / Back 指定。 |
| `setLayer`：`setLayer direction, layers` | 精灵 | `图层`、`层级`、`前移`、`后移`、`上移一层`、`下移一层`、`往前一层`、`往后一层`、`遮挡顺序`、`叠放顺序`、`前移图层`、`后移图层` | `layer`、`draw order`、`bring forward`、`send backward`、`move forward layers`、`move backward layers`、`stacking order` | 在当前层级上移动指定层数；不改变舞台坐标。 |
| `Front` | 精灵、舞台 | `最前`、`最前层`、`最上层`、`置顶`、`前景`、`移到最前` | `front`、`frontmost`、`front layer`、`top layer`、`bring to front` | 图层参数：放到最前；与“向前走”区分。 |
| `Back` | 精灵、舞台 | `最后`、`最后层`、`最底层`、`置底`、`底层`、`移到最后` | `back`、`backmost`、`back layer`、`bottom layer`、`send to back` | 图层参数：放到最后；不表示移动方向。 |
| `Forward` | 精灵、舞台 | `前移`、`前移一层`、`往前一层`、`上移一层`、`图层上移`、`层级向前`、`上一层` | `forward`、`layer forward`、`bring forward`、`move up a layer`、`move forward one layer` | 图层参数：相对向前移动；与坐标移动区分。 |
| `Backward` | 精灵、舞台 | `后移`、`后移一层`、`往后一层`、`下移一层`、`图层下移`、`层级向后`、`下一层` | `backward`、`layer backward`、`send backward`、`move down a layer`、`move back one layer` | 图层参数：相对向后移动；与坐标移动区分。 |
| `say`：`say word` | 精灵 | `说话`、`讲话`、`说一句话`、`对话`、`对白`、`聊天`、`说话气泡`、`显示文字` | `say`、`speak`、`talk`、`speech bubble`、`say something`、`dialogue`、`show text` | 显示当前精灵的说话气泡。 |
| `say`：`say word, seconds` | 精灵 | `说话`、`讲话`、`限时说话`、`说几秒`、`说话时间`、`说完消失`、`说话气泡`、`聊天`、`对话`、`对白`、`说一句话` | `say`、`speak`、`talk`、`speech bubble`、`say for seconds`、`timed speech`、`dialogue duration`、`say something` | 显示说话气泡，并指定显示时长。 |
| `think`：`think word` | 精灵 | `思考`、`想`、`想一想`、`想法`、`心里想`、`思考气泡`、`心里话` | `think`、`thinking`、`thought`、`thought bubble`、`think something`、`thinking bubble` | 显示当前精灵的思考气泡。 |
| `think`：`think word, seconds` | 精灵 | `思考`、`想法`、`想几秒`、`思考时间`、`限时思考`、`思考气泡`、`心里话`、`想一想`、`心里想` | `think`、`thought bubble`、`think for seconds`、`timed thought`、`thought duration`、`thought`、`thinking bubble`、`think something` | 显示思考气泡，并指定显示时长。 |
| `costumeName` | 精灵 | `造型`、`服装`、`衣服`、`装扮`、`当前造型`、`当前服装`、`造型名称`、`衣服名字`、`服装名字`、`衣服名称` | `costume`、`costumes`、`outfit`、`clothes`、`clothing`、`costume name`、`current costume`、`current outfit` | 读取当前造型的名字；不切换造型。 |
| `setCostume`：`setCostume name` | 精灵 | `造型`、`服装`、`衣服`、`换装`、`换造型`、`换衣服`、`换服装`、`更换造型`、`切换服装`、`装扮`、`更换服装`、`切换造型`、`更换衣服` | `costume`、`costumes`、`outfit`、`clothes`、`clothing`、`change costume`、`switch costume`、`change clothes`、`dress up`、`change outfit` | 切换到指定名字的造型；动画播放另用 animate。 |
| `animate`：`animate name` | 精灵 | `动画`、`播放动画`、`动作`、`播放动作`、`动起来`、`做动作`、`角色动画`、`动作动画` | `animation`、`play animation`、`animate`、`animate sprite`、`play action`、`sprite animation` | 播放指定动画；循环和等待写法分别列出。 |
| `animate`：`animate name, loop` | 精灵 | `动画`、`播放动画`、`动作`、`循环动画`、`循环播放动画`、`重复播放动画`、`一直播放动画`、`动作动画` | `animation`、`play animation`、`loop animation`、`repeat animation`、`looping animation`、`play animation repeatedly`、`animate sprite` | 循环播放指定动画；“循环动画”只关联循环写法。 |
| `animateAndWait`：`animateAndWait name` | 精灵 | `动画`、`播放动画`、`动作`、`播放动画并等待`、`等动画播完`、`动画结束后`、`播完再继续` | `animation`、`play animation`、`play animation and wait`、`wait for animation`、`wait until animation ends`、`finish animation first` | 播放指定动画，等播放结束后继续后面的代码。 |
| `stopAnimation`：`stopAnimation name` | 精灵 | `动画`、`停止动画`、`停下动画`、`结束动画`、`停止动作`、`停播动画` | `animation`、`stop animation`、`end animation`、`cancel animation`、`stop action` | 停止指定名字的动画；不停止声音或整个游戏。 |
| `backdropName` | 精灵、舞台 | `背景`、`场景`、`背景图`、`当前背景`、`当前场景`、`背景名字`、`背景名称`、`场景名字` | `backdrop`、`background`、`scene`、`backdrop name`、`background name`、`current backdrop`、`current scene` | 读取当前背景的名字。 |
| `backdropIndex` | 精灵、舞台 | `背景`、`场景`、`背景编号`、`背景序号`、`第几个背景`、`场景编号`、`当前背景序号` | `backdrop`、`background`、`scene`、`backdrop index`、`background number`、`scene number`、`which backdrop`、`background index` | 读取当前背景的序号；与背景名字区分。 |
| `setBackdrop`：`setBackdrop name` | 精灵、舞台 | `背景`、`场景`、`换背景`、`切换背景`、`换场景`、`更换场景`、`换背景图`、`指定背景`、`更换背景`、`切换场景`、`背景图` | `backdrop`、`background`、`scene`、`change backdrop`、`switch background`、`change scene`、`set backdrop`、`change background`、`switch scene` | 按名字切换背景；不等待背景事件处理完成。 |
| `setBackdrop`：`setBackdrop action` | 精灵、舞台 | `背景`、`场景`、`换背景`、`切换场景`、`下一个背景`、`上一个背景`、`下一个场景`、`上一个场景`、`更换背景`、`换场景`、`背景图` | `backdrop`、`background`、`scene`、`next backdrop`、`previous backdrop`、`next background`、`previous scene`、`switch scene`、`change background`、`previous background` | 按 Next / Prev 切换到下一个或上一个背景。 |
| `setBackdropAndWait`：`setBackdropAndWait name` | 精灵、舞台 | `背景`、`场景`、`换背景`、`换场景`、`换背景并等待`、`切换场景并等待`、`等背景事件结束` | `backdrop`、`background`、`scene`、`change backdrop and wait`、`switch scene and wait`、`wait for backdrop events`、`change background and wait` | 切换背景，并等待关联的 onBackdrop 行为结束。 |
| `changeGraphicEffect`：`changeGraphicEffect kind, value` | 精灵、舞台 | `特效`、`效果`、`视觉效果`、`颜色`、`色彩`、`变色`、`调整特效`、`改变特效`、`增加特效值`、`亮度`、`鱼眼`、`马赛克`、`像素化`、`漩涡`、`旋转特效`、`幽灵`、`透明度` | `effect`、`graphic effect`、`visual effect`、`color`、`colour`、`change effect`、`adjust effect`、`change color`、`color effect`、`brightness`、`fisheye`、`fish eye`、`mosaic`、`pixelate`、`pixelation`、`whirl`、`ghost`、`transparency` | 在当前特效值上增减；具体效果由 kind 决定。 |
| `setGraphicEffect`：`setGraphicEffect kind, value` | 精灵、舞台 | `特效`、`效果`、`视觉效果`、`颜色`、`色彩`、`变色`、`设置特效`、`设置特效值`、`颜色特效`、`亮度`、`鱼眼`、`马赛克`、`像素化`、`漩涡`、`旋转特效`、`幽灵`、`透明度` | `effect`、`graphic effect`、`visual effect`、`color`、`colour`、`set effect`、`set graphic effect`、`set color`、`color effect`、`brightness`、`fisheye`、`fish eye`、`mosaic`、`pixelate`、`pixelation`、`whirl`、`ghost`、`transparency` | 把指定特效设为给定值；具体效果由 kind 决定。 |
| `clearGraphicEffects` | 精灵、舞台 | `特效`、`清除特效`、`取消特效`、`清空特效`、`还原特效`、`恢复原样`、`恢复外观` | `effect`、`clear effects`、`reset effects`、`remove effects`、`restore appearance`、`reset appearance` | 清除全部图形特效；不重置造型、位置或游戏。 |

## 运动

| API / 写法 | 适用对象 | 中文关键词建议 | 英文关键词建议 | 含义与区分 |
| --- | --- | --- | --- | --- |
| `xpos` | 精灵 | `位置`、`坐标`、`横坐标`、`水平位置`、`左右位置`、`X坐标`、`x坐标`、`当前横坐标`、`角色位置` | `position`、`coordinate`、`x position`、`x coordinate`、`horizontal position`、`current x` | 读取精灵的 X 坐标。 |
| `ypos` | 精灵 | `位置`、`坐标`、`纵坐标`、`垂直位置`、`上下位置`、`Y坐标`、`y坐标`、`当前纵坐标`、`角色位置` | `position`、`coordinate`、`y position`、`y coordinate`、`vertical position`、`current y` | 读取精灵的 Y 坐标。 |
| `step`：`step distance` | 精灵 | `移动`、`走`、`走路`、`行走`、`前进`、`往前走`、`走几步`、`走多远`、`移动距离` | `move`、`walk`、`step`、`move forward`、`walk forward`、`move steps`、`walking distance` | 沿当前朝向走指定距离，并播放行走状态动画。 |
| `step`：`step distance, speed` | 精灵 | `移动`、`走`、`走路`、`前进`、`行走速度`、`走快点`、`走慢点`、`走多远`、`指定速度`、`往前走`、`行走` | `move`、`walk`、`move forward`、`walk speed`、`walking speed`、`walk faster`、`walk slower`、`move at speed` | 沿当前朝向行走，并指定速度。 |
| `stepTo`：`stepTo sprite` | 精灵 | `移动`、`走到`、`走向`、`靠近角色`、`走到角色`、`走到精灵`、`走过去`、`走到目标`、`移动到`、`走到指定位置` | `move`、`walk`、`move to`、`go to`、`walk to sprite`、`go to character`、`approach sprite`、`walk to` | 走到指定精灵；单次到达，不表示持续跟随。 |
| `stepTo`：`stepTo x, y` | 精灵 | `移动`、`位置`、`坐标`、`走到`、`走到指定位置`、`走到坐标`、`移动到坐标`、`走过去`、`走向`、`移动到`、`走到角色` | `move`、`walk`、`move to`、`go to position`、`walk to coordinates`、`go to xy`、`target position`、`go to`、`walk to` | 走到指定 X、Y 坐标。 |
| `stepTo`：`stepTo sprite, speed` | 精灵 | `移动`、`走到`、`走向`、`走到角色`、`靠近角色`、`行走速度`、`走快点`、`走慢点`、`移动到`、`走到指定位置` | `move`、`walk to sprite`、`go to character`、`move to`、`walk speed`、`approach sprite at speed`、`go to`、`walk to` | 走到指定精灵，并指定行走速度。 |
| `stepTo`：`stepTo x, y, speed` | 精灵 | `移动`、`走到`、`走到坐标`、`走到指定位置`、`行走速度`、`走快点`、`走慢点`、`走向`、`移动到`、`走到角色` | `move`、`move to`、`walk to coordinates`、`go to position`、`walk speed`、`move to xy at speed`、`go to`、`walk to` | 走到指定 X、Y 坐标，并指定行走速度。 |
| `glide`：`glide x, y, seconds` | 精灵 | `移动`、`滑动`、`滑行`、`滑到`、`平滑移动`、`移动到`、`滑到坐标`、`移动时间`、`几秒到达` | `move`、`glide`、`slide`、`smooth move`、`glide to position`、`glide to coordinates`、`move over seconds`、`glide to` | 在指定秒数内滑行到 X、Y 坐标；与行走速度区分。 |
| `glide`：`glide sprite, seconds` | 精灵 | `移动`、`滑动`、`滑行`、`滑到`、`平滑移动`、`滑到角色`、`移动到精灵`、`移动时间`、`移动到` | `move`、`glide`、`slide`、`smooth move`、`glide to sprite`、`glide to character`、`move over seconds`、`glide to` | 在指定秒数内滑行到另一个精灵。 |
| `glide`：`glide object, seconds` | 精灵 | `移动`、`滑动`、`滑行`、`滑到`、`平滑移动`、`滑到鼠标`、`移动到目标`、`移动时间`、`移动到` | `move`、`glide`、`slide`、`smooth move`、`glide to mouse`、`glide to target`、`move over seconds`、`glide to` | 在指定秒数内滑行到对象，如鼠标位置。 |
| `changeXpos`：`changeXpos dX` | 精灵 | `移动`、`横坐标`、`左右移动`、`水平移动`、`向左移动`、`向右移动`、`左移`、`右移`、`改变X坐标`、`改变横坐标` | `move`、`change x`、`move horizontally`、`move left`、`move right`、`shift left`、`shift right` | 在当前 X 坐标上增减；增减方向由参数正负决定。 |
| `setXpos`：`setXpos x` | 精灵 | `位置`、`横坐标`、`水平位置`、`左右位置`、`设置横坐标`、`设置X坐标`、`移到横坐标`、`左右移动`、`x坐标` | `position`、`set x`、`set x position`、`set x coordinate`、`horizontal position`、`move to x`、`move horizontally` | 直接设定 X 坐标，保持 Y 坐标。 |
| `changeYpos`：`changeYpos dY` | 精灵 | `移动`、`纵坐标`、`上下移动`、`垂直移动`、`向上移动`、`向下移动`、`上移`、`下移`、`改变Y坐标`、`改变纵坐标` | `move`、`change y`、`move vertically`、`move up`、`move down`、`shift up`、`shift down` | 在当前 Y 坐标上增减；增减方向由参数正负决定。 |
| `setYpos`：`setYpos y` | 精灵 | `位置`、`纵坐标`、`垂直位置`、`上下位置`、`设置纵坐标`、`设置Y坐标`、`移到纵坐标`、`上下移动`、`y坐标` | `position`、`set y`、`set y position`、`set y coordinate`、`vertical position`、`move to y`、`move vertically` | 直接设定 Y 坐标，保持 X 坐标。 |
| `heading` | 精灵 | `方向`、`朝向`、`面向`、`角度`、`旋转角度`、`当前方向`、`当前角度`、`朝哪里` | `direction`、`heading`、`facing`、`angle`、`rotation angle`、`current direction`、`current heading` | 读取精灵当前朝向；不转动精灵。 |
| `turn`：`turn direction` | 精灵 | `方向`、`朝向`、`转向`、`转弯`、`转动`、`旋转`、`转圈`、`打转`、`左转`、`右转` | `direction`、`turn`、`rotate`、`rotation`、`spin`、`turn around`、`turn left`、`turn right` | 按指定方向旋转；持续转圈还需配合循环或参数。 |
| `turn`：`turn direction, speed` | 精灵 | `方向`、`朝向`、`转向`、`转弯`、`旋转`、`转圈`、`打转`、`转速`、`转快点`、`转慢点`、`转动`、`左转`、`右转` | `direction`、`turn`、`rotate`、`spin`、`turn around`、`turn speed`、`rotation speed`、`turn faster`、`turn slower`、`turn left`、`turn right` | 按指定方向旋转，并指定旋转速度。 |
| `turnTo`：`turnTo sprite` | 精灵 | `方向`、`朝向`、`转向`、`面向`、`看向`、`面向角色`、`转向角色`、`朝向精灵`、`看向目标`、`朝向角色`、`看向角色` | `direction`、`face`、`turn to`、`turn towards`、`face sprite`、`point towards sprite`、`look at character` | 转向指定精灵；不移动位置。 |
| `turnTo`：`turnTo sprite, speed` | 精灵 | `方向`、`朝向`、`转向`、`面向`、`看向角色`、`转向角色`、`转速`、`慢慢转向`、`面向角色`、`朝向角色` | `direction`、`face`、`turn towards`、`face sprite`、`point towards sprite`、`turn speed`、`turn slowly` | 转向指定精灵，并指定旋转速度。 |
| `changeHeading`：`changeHeading degree` | 精灵 | `方向`、`朝向`、`转向`、`角度`、`转圈`、`打转`、`旋转`、`改变角度`、`转几度`、`增加角度`、`改变方向`、`调整角度`、`转动角度`、`旋转角度` | `direction`、`heading`、`turn`、`rotate`、`spin`、`change direction`、`change heading`、`rotate by`、`turn degrees`、`change angle` | 在当前朝向上增加给定角度；正负值决定转动方向。 |
| `setHeading`：`setHeading direction` | 精灵 | `方向`、`朝向`、`转向`、`面向`、`角度`、`设置朝向`、`设置方向`、`朝左`、`朝右`、`面朝哪个方向`、`设置角度`、`面向方向`、`朝哪个方向` | `direction`、`heading`、`facing`、`set direction`、`set heading`、`point in direction`、`face left`、`face right`、`set angle` | 把朝向设为指定方向；与增加角度区分。 |
| `Up` | 精灵、舞台 | `上`、`向上`、`朝上`、`上方`、`上方向`、`往上` | `up`、`upward`、`upwards`、`face up`、`north` | 方向参数：向上，角度为 0；不自行移动。 |
| `Down` | 精灵、舞台 | `下`、`向下`、`朝下`、`下方`、`下方向`、`往下` | `down`、`downward`、`downwards`、`face down`、`south` | 方向参数：向下，角度为 180；不自行移动。 |
| `Left` | 精灵、舞台 | `左`、`向左`、`朝左`、`左边`、`左方向`、`往左` | `left`、`leftward`、`leftwards`、`face left`、`west` | 方向参数：向左，角度为 -90；不自行移动。 |
| `Right` | 精灵、舞台 | `右`、`向右`、`朝右`、`右边`、`右方向`、`往右` | `right`、`rightward`、`rightwards`、`face right`、`east` | 方向参数：向右，角度为 90；不自行移动。 |
| `size` | 精灵 | `大小`、`尺寸`、`缩放`、`缩放比例`、`当前大小`、`角色大小`、`放大倍数` | `size`、`scale`、`sprite size`、`current size`、`scale factor`、`size ratio` | 读取相对初始大小的比例；不改变大小。 |
| `changeSize`：`changeSize dSize` | 精灵 | `大小`、`缩放`、`放大`、`缩小`、`变大`、`变小`、`增大`、`减小`、`调整大小`、`改变大小` | `size`、`scale`、`resize`、`grow`、`shrink`、`get bigger`、`get smaller`、`change size`、`increase size`、`decrease size`、`change scale` | 在当前大小上增减；与直接设置大小区分。 |
| `setSize`：`setSize size` | 精灵 | `大小`、`缩放`、`放大`、`缩小`、`变大`、`变小`、`设置大小`、`设置倍数`、`缩放比例` | `size`、`scale`、`resize`、`grow`、`shrink`、`set size`、`set scale`、`scale factor` | 把大小设为相对初始大小的给定比例。 |
| `setRotationStyle`：`setRotationStyle style` | 精灵 | `旋转`、`翻转`、`旋转方式`、`旋转模式`、`左右翻转`、`自由旋转`、`不旋转`、`镜像`、`翻转方式` | `rotation`、`rotation style`、`rotation mode`、`flip style`、`left right flip`、`no rotation`、`free rotation` | 选择外观如何跟随方向旋转；与转动角度区分。 |
| `None` | 精灵、舞台 | `不旋转`、`禁止旋转`、`固定方向`、`固定朝向`、`锁定旋转`、`不转动` | `no rotation`、`do not rotate`、`rotation disabled`、`lock rotation`、`fixed facing` | 旋转方式参数：外观不旋转。 |
| `Normal` | 精灵、舞台 | `旋转`、`正常旋转`、`自由旋转`、`任意旋转`、`跟随方向旋转`、`全方向旋转` | `normal rotation`、`free rotation`、`all around`、`all around rotation`、`rotate freely` | 旋转方式参数：外观正常跟随朝向旋转。 |
| `LeftRight` | 精灵、舞台 | `翻转`、`左右翻转`、`水平翻转`、`左右镜像`、`镜像`、`只左右转`、`镜像翻转` | `flip`、`left right flip`、`horizontal flip`、`mirror`、`flip horizontally`、`left right rotation` | 旋转方式参数：只左右翻转；不表示上下翻转。 |
| `physicsMode` | 精灵 | `物理`、`物理模式`、`物理效果`、`当前物理模式`、`是否启用物理` | `physics`、`physics mode`、`physics state`、`current physics mode`、`physics enabled` | 读取精灵当前物理模式；不直接改变运动状态。 |
| `velocity` | 精灵 | `速度`、`运动速度`、`当前速度`、`物理速度`、`水平速度`、`垂直速度`、`移动速度` | `speed`、`velocity`、`current velocity`、`movement speed`、`horizontal velocity`、`vertical velocity`、`physics velocity` | 读取物理速度向量 (vx, vy)；与单次行走参数区分。 |
| `gravity` | 精灵 | `重力`、`重力大小`、`重力比例`、`当前重力`、`受到的重力`、`下落`、`重力加速度` | `gravity`、`gravity scale`、`gravity factor`、`current gravity`、`falling`、`gravitational acceleration` | 读取相对全局重力的比例；单独读取不会下落。 |
| `isOnFloor` | 精灵 | `落地`、`着地`、`地面`、`是否落地`、`是否着地`、`在地面上`、`站在地上`、`地面检测` | `ground`、`floor`、`on ground`、`on floor`、`grounded`、`is on floor`、`ground check` | 判断当前是否在地面上；不是“落地时执行”的事件。 |
| `setPhysicsMode`：`setPhysicsMode mode` | 精灵 | `物理`、`物理模式`、`开启物理`、`关闭物理`、`启用物理`、`禁用物理`、`物理效果`、`设置物理模式` | `physics`、`physics mode`、`set physics`、`enable physics`、`disable physics`、`physics simulation` | 设置物理模式；具体运动表现由模式及相关配置决定。 |
| `setVelocity`：`setVelocity vx, vy` | 精灵 | `速度`、`运动速度`、`设置速度`、`改变速度`、`水平速度`、`垂直速度`、`向左飞`、`向右飞`、`下落速度`、`下落`、`掉落` | `speed`、`velocity`、`set velocity`、`set speed`、`horizontal speed`、`vertical speed`、`fall speed`、`fall`、`falling` | 设置物理速度向量；方向由 vx、vy 的值决定。 |
| `setGravity`：`setGravity g` | 精灵 | `重力`、`设置重力`、`调整重力`、`无重力`、`失重`、`关闭重力`、`下落`、`掉落`、`重力加速度` | `gravity`、`set gravity`、`change gravity`、`zero gravity`、`no gravity`、`fall`、`falling` | 设置相对重力；下落还依赖物理模式等配置。 |
| `addImpulse`：`addImpulse ix, iy` | 精灵 | `冲量`、`推力`、`推一下`、`跳`、`跳跃`、`起跳`、`弹起`、`弹跳`、`瞬间加速` | `impulse`、`push`、`jump`、`jump up`、`hop`、`boost`、`instant velocity change` | 瞬时改变速度，可用于起跳；持续跳跃还需事件或循环。 |
| `bounceOffEdge` | 精灵 | `反弹`、`弹回`、`碰边反弹`、`碰墙反弹`、`边缘反弹`、`遇到边缘就反弹`、`碰到屏幕边缘`、`碰到边缘反弹`、`边界反弹` | `bounce`、`bounce off edge`、`edge bounce`、`bounce on edge`、`rebound`、`bounce off boundary`、`bounce off wall` | 接触舞台边缘时反弹；不等于任意墙体或精灵碰撞。 |

## 控制

| API / 写法 | 适用对象 | 中文关键词建议 | 英文关键词建议 | 含义与区分 |
| --- | --- | --- | --- | --- |
| `wait`：`wait seconds` | 精灵、舞台 | `等待`、`等`、`等一下`、`等一会`、`暂停一会`、`延时`、`延迟`、`等几秒`、`等待一秒` | `wait`、`delay`、`pause`、`wait a second`、`wait for seconds`、`pause for seconds` | 等待指定秒数，再继续当前这段代码；不等于暂停整个游戏。 |
| `waitUntil`：`waitUntil condition` | 精灵、舞台 | `等待`、`等到`、`等待条件`、`等条件成立`、`满足条件再继续`、`等到满足条件`、`条件等待` | `wait`、`wait until`、`wait for condition`、`wait until true`、`wait for something` | 等待条件成立，再继续后面的代码。 |
| `timer` | 精灵、舞台 | `时间`、`计时`、`计时器`、`秒表`、`运行时间`、`过了多久`、`已经过了几秒`、`已经过了多久` | `time`、`timer`、`stopwatch`、`elapsed time`、`time passed`、`seconds elapsed` | 读取计时器值；倒计时需要结合其他写法。 |
| `resetTimer` | 精灵、舞台 | `时间`、`计时`、`重新计时`、`计时清零`、`计时器归零`、`重置秒表`、`从零计时` | `time`、`timer`、`reset timer`、`restart timer`、`reset stopwatch`、`reset elapsed time` | 把计时器归零；不重新开始游戏。 |
| `forever`：`forever => {}` | 精灵、舞台 | `循环`、`重复`、`无限循环`、`一直循环`、`一直重复`、`一直执行`、`永远重复`、`反复执行` | `loop`、`repeat`、`forever`、`forever loop`、`infinite loop`、`repeat forever`、`keep running` | 无限重复执行其中的代码。 |
| `repeat`：`repeat times, => {}` | 精灵、舞台 | `循环`、`重复`、`重复几次`、`循环次数`、`执行几次`、`重复指定次数`、`重复十次` | `loop`、`repeat`、`repeat times`、`repeat n times`、`counted loop`、`loop count`、`do several times`、`repeat loop` | 重复执行给定次数；与无限循环区分。 |
| `repeatUntil`：`repeatUntil condition, => {}` | 精灵、舞台 | `循环`、`重复`、`循环直到`、`重复直到`、`直到满足条件`、`满足条件停止`、`重复到条件成立` | `loop`、`repeat`、`repeat until`、`loop until`、`until condition`、`stop when true`、`conditional loop` | 重复执行直到条件成立；不是条件成立后才开始。 |
| `for_iterate`：`for v in arr {}` | 精灵、舞台 | `数组`、`列表`、`遍历`、`遍历数组`、`遍历列表`、`循环数组`、`逐个处理`、`每一项`、`每个元素` | `array`、`list`、`iterate`、`iterate array`、`iterate list`、`for each`、`loop through`、`each item`、`each element`、`loop array` | 逐个处理已有数组或列表中的元素；不负责创建数组。 |
| `if_statement`：`if condition {}` | 精灵、舞台 | `如果`、`判断`、`条件`、`条件判断`、`如果满足条件`、`满足条件执行`、`是否成立` | `if`、`condition`、`conditional`、`check condition`、`if true`、`if statement` | 条件成立时执行其中的代码。 |
| `if_else_statement`：`if condition {} else {}` | 精灵、舞台 | `如果`、`否则`、`不然`、`要不然`、`条件判断`、`如果否则`、`两种情况`、`条件分支`、`判断` | `if`、`else`、`if else`、`otherwise`、`conditional branch`、`either case`、`if not` | 条件成立执行一段，否则执行另一段。 |
| `var_declaration`：`var name type` | 精灵、舞台 | `变量`、`定义`、`声明`、`定义变量`、`声明变量`、`创建变量`、`新建变量`、`记录数值`、`保存数据` | `variable`、`define`、`declare`、`declaration`、`define variable`、`declare variable`、`create variable`、`store value` | 声明变量，如 var count int；这条写法本身不赋初始值。本轮已加入本地面板。 |
| `func_declaration`：`func name(params) {}` | 精灵、舞台 | `函数`、`定义`、`声明`、`定义函数`、`声明函数`、`自定义函数`、`创建函数`、`定义方法`、`封装代码` | `function`、`define`、`declare`、`definition`、`define function`、`declare function`、`custom function`、`create function` | 在导入语句之后、事件代码之前插入无参函数；函数体中的行为需要调用后才会执行。本轮已加入本地面板。 |

## 感知

| API / 写法 | 适用对象 | 中文关键词建议 | 英文关键词建议 | 含义与区分 |
| --- | --- | --- | --- | --- |
| `touching`：`touching(sprite)` | 精灵 | `触碰`、`碰到`、`碰撞`、`接触`、`碰撞检测`、`是否碰到`、`是否接触`、`碰到角色`、`角色相碰` | `touch`、`touching`、`contact`、`collision`、`collide`、`is touching`、`touching sprite`、`collision check` | 判断是否与另一个精灵接触；碰到时执行用 onTouchStart。 |
| `touching`：`touching(object)` | 精灵 | `触碰`、`碰到`、`碰撞`、`接触`、`碰撞检测`、`是否碰到`、`碰到边缘`、`碰到目标`、`是否接触` | `touch`、`touching`、`contact`、`collision`、`collide`、`is touching`、`touching edge`、`touching object` | 判断是否与指定对象（如舞台边缘）接触。 |
| `distanceTo`：`distanceTo(sprite)` | 精灵 | `距离`、`间距`、`测距`、`相隔多远`、`离多远`、`距离角色`、`离角色多远`、`两个角色的距离` | `distance`、`how far`、`distance to sprite`、`distance between sprites`、`distance to character`、`measure distance`、`distance between` | 读取当前精灵到指定精灵的距离。 |
| `distanceTo`：`distanceTo(object)` | 精灵 | `距离`、`间距`、`测距`、`相隔多远`、`离多远`、`距离鼠标`、`离鼠标多远`、`到目标的距离` | `distance`、`how far`、`distance to mouse`、`distance to target`、`distance to object`、`measure distance`、`distance between` | 读取当前精灵到指定对象（如鼠标）的距离。 |
| `Edge` | 精灵、舞台 | `边缘`、`边界`、`屏幕边缘`、`屏幕边界`、`舞台边缘`、`四周边界` | `edge`、`boundary`、`border`、`stage edge`、`screen edge`、`screen border`、`stage boundary` | 舞台边缘对象，可作为碰撞判断等操作的参数。 |
| `EdgeBottom` | 精灵、舞台 | `下边缘`、`下边界`、`底边`、`底部边缘`、`屏幕下边缘`、`舞台下边缘` | `bottom`、`bottom edge`、`bottom border`、`bottom boundary`、`screen bottom`、`stage bottom` | 舞台下边缘对象；与物理地面状态区分。 |
| `EdgeLeft` | 精灵、舞台 | `左边缘`、`左边界`、`左侧边缘`、`屏幕左边缘`、`舞台左边缘` | `left edge`、`left border`、`left boundary`、`screen left`、`stage left` | 舞台左边缘对象。 |
| `EdgeRight` | 精灵、舞台 | `右边缘`、`右边界`、`右侧边缘`、`屏幕右边缘`、`舞台右边缘` | `right edge`、`right border`、`right boundary`、`screen right`、`stage right` | 舞台右边缘对象。 |
| `EdgeTop` | 精灵、舞台 | `上边缘`、`上边界`、`顶边`、`顶部边缘`、`屏幕上边缘`、`舞台上边缘` | `top`、`top edge`、`top border`、`top boundary`、`screen top`、`stage top` | 舞台上边缘对象。 |
| `mouseX` | 精灵、舞台 | `鼠标`、`鼠标位置`、`鼠标坐标`、`鼠标横坐标`、`鼠标X坐标`、`鼠标左右位置`、`鼠标水平位置` | `mouse`、`mouse position`、`cursor position`、`mouse x`、`mouse x coordinate`、`cursor x` | 读取鼠标的 X 坐标。 |
| `mouseY` | 精灵、舞台 | `鼠标`、`鼠标位置`、`鼠标坐标`、`鼠标纵坐标`、`鼠标Y坐标`、`鼠标上下位置`、`鼠标垂直位置` | `mouse`、`mouse position`、`cursor position`、`mouse y`、`mouse y coordinate`、`cursor y` | 读取鼠标的 Y 坐标。 |
| `Mouse` | 精灵、舞台 | `鼠标`、`鼠标指针`、`光标`、`指针`、`鼠标目标` | `mouse`、`cursor`、`pointer`、`mouse pointer`、`mouse target` | 表示鼠标的对象，可用作转向、距离或滑行等操作的目标。 |
| `keyPressed`：`keyPressed(key)` | 精灵、舞台 | `按键`、`键盘`、`按住`、`一直按着`、`是否按下`、`是否按住`、`按键检测`、`键盘检测`、`按住按键` | `keyboard`、`key`、`key held`、`hold key`、`is key pressed`、`key state`、`while key pressed` | 判断按键当前是否按下；不注册按下事件。 |
| `ask`：`ask question` | 精灵、舞台 | `提问`、`问`、`问问题`、`询问`、`输入`、`玩家输入`、`输入文字`、`输入框`、`等待回答` | `ask`、`question`、`ask question`、`input`、`user input`、`player input`、`text input`、`input box` | 向玩家提问并等待回答；获取结果用 answer。 |
| `answer` | 精灵、舞台 | `回答`、`答案`、`输入`、`输入内容`、`输入的文字`、`玩家回答`、`回答内容`、`提问结果` | `answer`、`response`、`input`、`input text`、`user response`、`player answer`、`question result` | 读取玩家对 ask 的回答；不弹出输入框。 |

## 声音

| API / 写法 | 适用对象 | 中文关键词建议 | 英文关键词建议 | 含义与区分 |
| --- | --- | --- | --- | --- |
| `stopAllSounds` | 精灵、舞台 | `声音`、`音乐`、`音效`、`停止所有声音`、`停止全部音乐`、`全部停止播放`、`停止所有音效`、`停止所有音乐`、`停止全部声音` | `sound`、`music`、`audio`、`stop all sounds`、`stop all music`、`stop all audio`、`stop all playback` | 停止所有正在播放的声音；与停止某一个声音区分。 |
| `play`：`play sound` | 精灵、舞台 | `声音`、`音乐`、`音效`、`背景音乐`、`配乐`、`播放`、`播放声音`、`播放音乐`、`播放音效`、`背景音` | `sound`、`music`、`audio`、`play sound`、`play music`、`play audio`、`background music`、`bgm`、`sound effect` | 播放指定声音；播放后继续执行后面的代码。 |
| `play`：`play sound, loop` | 精灵、舞台 | `声音`、`音乐`、`音效`、`背景音乐`、`配乐`、`播放`、`循环播放`、`循环音乐`、`重复播放声音`、`一直播放音乐`、`播放音乐`、`播放音效`、`背景音`、`循环播放声音` | `sound`、`music`、`audio`、`play sound`、`play music`、`loop sound`、`loop music`、`repeat sound`、`looping audio`、`bgm`、`play audio`、`background music`、`sound effect` | 循环播放指定声音；“循环音乐”只关联循环写法。 |
| `playAndWait`：`playAndWait sound` | 精灵、舞台 | `声音`、`音乐`、`音效`、`播放声音`、`播放音乐`、`播放并等待`、`等声音播完`、`等音乐结束`、`播完再继续`、`播放音乐并等待`、`背景音乐` | `sound`、`music`、`audio`、`play sound`、`play music`、`play and wait`、`wait for sound`、`wait until music ends`、`play music and wait`、`background music`、`bgm` | 播放指定声音，等待播完后继续后面的代码。 |
| `pausePlaying`：`pausePlaying sound` | 精灵、舞台 | `声音`、`音乐`、`暂停`、`暂停声音`、`暂停音乐`、`暂停播放`、`暂停音效`、`先停一下` | `sound`、`music`、`pause`、`pause sound`、`pause music`、`pause audio`、`pause playback` | 暂停指定声音；可用 resumePlaying 继续播放。 |
| `resumePlaying`：`resumePlaying sound` | 精灵、舞台 | `声音`、`音乐`、`继续`、`继续播放`、`恢复播放`、`恢复声音`、`继续音乐`、`接着播放`、`恢复音乐` | `sound`、`music`、`resume`、`continue`、`resume sound`、`resume music`、`resume playback`、`continue playing` | 从暂停处恢复指定声音；与从头播放区分。 |
| `stopPlaying`：`stopPlaying sound` | 精灵、舞台 | `声音`、`音乐`、`停止`、`停止声音`、`停止音乐`、`停止音效`、`停止播放`、`结束播放` | `sound`、`music`、`stop`、`stop sound`、`stop music`、`stop audio`、`stop playback`、`end playback` | 停止指定名字的声音；与暂停、停止全部声音区分。 |
| `volume` | 精灵、舞台 | `声音`、`音乐`、`音量`、`声音大小`、`响度`、`当前音量`、`音乐音量` | `sound`、`music`、`volume`、`loudness`、`sound level`、`current volume`、`audio level` | 读取当前音量；不改变音量。 |
| `changeVolume`：`changeVolume dVolume` | 精灵、舞台 | `音量`、`声音大小`、`调音量`、`调整音量`、`调大声音`、`调小声音`、`大声点`、`小声点`、`增大音量`、`减小音量` | `volume`、`loudness`、`change volume`、`adjust volume`、`louder`、`quieter`、`turn up`、`turn down` | 在当前音量上增减；与直接设置音量区分。 |
| `setVolume`：`setVolume volume` | 精灵、舞台 | `音量`、`声音大小`、`调音量`、`设置音量`、`调大声音`、`调小声音`、`大声点`、`小声点`、`静音`、`无声` | `volume`、`sound level`、`set volume`、`louder`、`quieter`、`turn up`、`turn down`、`mute`、`silent` | 直接设置音量；设为 0 可静音。 |

## 游戏

| API / 写法 | 适用对象 | 中文关键词建议 | 英文关键词建议 | 含义与区分 |
| --- | --- | --- | --- | --- |
| `clone` | 精灵 | `克隆`、`复制`、`分身`、`复制角色`、`复制精灵`、`创建分身`、`克隆角色`、`再造一个` | `clone`、`copy`、`duplicate`、`copy sprite`、`clone character`、`create clone`、`duplicate sprite` | 复制当前精灵；克隆完成后的行为用 onCloned。 |
| `die` | 精灵 | `死亡`、`死掉`、`死了`、`角色死亡`、`精灵死亡`、`让角色死掉`、`死亡动画` | `die`、`death`、`dead`、`sprite death`、`character death`、`death animation` | 让精灵死亡并播放死亡状态动画；与隐藏、删除区分。 |
| `Camera.zoom` | 精灵、舞台 | `镜头`、`摄像机`、`缩放`、`镜头比例`、`镜头缩放`、`摄像机缩放`、`当前缩放` | `camera`、`zoom`、`camera zoom`、`zoom level`、`zoom factor`、`current zoom` | 读取摄像机缩放比例；不改变镜头。 |
| `Camera.setZoom`：`Camera.setZoom zoom` | 精灵、舞台 | `镜头`、`摄像机`、`缩放`、`镜头放大`、`镜头缩小`、`拉近镜头`、`拉远镜头`、`放大画面`、`缩小画面`、`摄像机缩放` | `camera`、`zoom`、`camera zoom`、`set zoom`、`zoom in`、`zoom out`、`zoom camera`、`scale view` | 设置摄像机缩放比例；不改变精灵本身的大小。 |
| `Camera.xpos` | 精灵、舞台 | `镜头`、`摄像机`、`镜头位置`、`摄像机位置`、`镜头横坐标`、`镜头X坐标`、`镜头水平位置`、`摄像机水平位置` | `camera`、`camera position`、`camera x`、`camera x position`、`camera x coordinate`、`camera horizontal position` | 读取摄像机中心的 X 坐标。 |
| `Camera.ypos` | 精灵、舞台 | `镜头`、`摄像机`、`镜头位置`、`摄像机位置`、`镜头纵坐标`、`镜头Y坐标`、`镜头垂直位置`、`摄像机垂直位置` | `camera`、`camera position`、`camera y`、`camera y position`、`camera y coordinate`、`camera vertical position` | 读取摄像机中心的 Y 坐标。 |
| `Camera.setXYpos`：`Camera.setXYpos x, y` | 精灵、舞台 | `镜头`、`摄像机`、`镜头位置`、`移动镜头`、`移动摄像机`、`设置镜头位置`、`镜头移到坐标` | `camera`、`camera position`、`move camera`、`pan camera`、`set camera position`、`camera coordinates` | 设置摄像机中心坐标；不移动场景中的精灵。 |
| `Camera.follow`：`Camera.follow sprite` | 精灵、舞台 | `镜头`、`摄像机`、`跟随`、`镜头跟随`、`摄像机跟随`、`跟随角色`、`跟着角色`、`镜头跟着走` | `camera`、`follow`、`camera follow`、`follow sprite`、`follow character`、`track sprite`、`follow player` | 让摄像机持续跟随指定精灵；不是让另一个精灵跟随。 |
| `println`：`println msg, ...` | 精灵、舞台 | `打印`、`输出`、`输出文字`、`打印文字`、`打印变量`、`调试`、`调试输出`、`控制台`、`日志` | `print`、`output`、`print text`、`print variable`、`console`、`log`、`debug`、`debug output` | 把信息输出到控制台；舞台上显示说话文字用 say。 |
| `rand`：`rand(from, to)`（整数） | 精灵、舞台 | `随机`、`随机数`、`随机整数`、`随机数字`、`取随机数`、`随机取值`、`随机选个数` | `random`、`random number`、`random integer`、`random int`、`pick random`、`random value` | 在给定范围内取随机整数，如 rand(1, 10)。 |
| `rand`：`rand(from, to)`（小数） | 精灵、舞台 | `随机`、`随机数`、`随机小数`、`随机数字`、`随机浮点数`、`随机取值`、`随机选个数` | `random`、`random number`、`random decimal`、`random float`、`pick random`、`random value` | 使用小数范围取随机数，如 rand(1.5, 9.9)。 |
| `exit` | 精灵、舞台 | `结束`、`停止`、`退出`、`结束游戏`、`停止游戏`、`退出游戏`、`结束运行`、`停止运行` | `exit`、`quit`、`end game`、`stop game`、`quit game`、`stop running`、`exit game` | 退出整个游戏；与暂停声音、停止单个动作区分。 |
| `getWidget`：`getWidget(T, name)` | 精灵、舞台 | `控件`、`组件`、`界面组件`、`获取控件`、`查找控件`、`找到控件`、`按名字找控件` | `widget`、`ui element`、`ui component`、`get widget`、`find widget`、`lookup widget`、`widget by name` | 按类型和名字获取已有控件；不负责新建控件。 |

## 概念词与组合任务

| 用户可能搜索的词 | 建议关联 | 需要说明的边界 |
| --- | --- | --- |
| `朝向`、`方向`、`heading`、`direction` | `heading`、`turn`、`turnTo`、`setHeading`、`changeHeading` | 通过说明区分读取朝向、转向目标、设置角度和改变角度。 |
| `转圈`、`打转`、`spin`、`turn around` | `turn`、`changeHeading`；持续执行时配合循环 | 相关旋转写法不是完整的“无限转圈”脚本。 |
| `触碰`、`碰撞`、`touch`、`collision` | `touching`、`onTouchStart` | 区分判断当前是否碰到，以及开始碰到时执行。 |
| `跳跃`、`起跳`、`jump`、`hop` | `addImpulse`，并参考物理模式 | 实际跳跃受物理模式、重力和参数影响。 |
| `下落`、`掉落`、`fall`、`falling` | `setGravity`、`setVelocity`，并参考物理模式 | 下落与“摔倒动画”“死亡”分开说明。 |
| `跟随角色`、`follow character` | `Camera.follow` | 目前可直接找到的是镜头跟随；精灵持续追逐另一个精灵需要组合行为。 |
| `数组`、`列表`、`array`、`list` | `for_iterate` | 当前条目覆盖遍历；创建数组、添加或删除元素仍需另行整理写法。 |
| `定义`、`声明`、`define`、`declare` | 变量声明、函数定义 | 两条写法已加入本地面板；不等同于搜索项目中已有定义。 |

## 待讨论的词与未纳入条目

| 内容 | 当前情况 | 下一步需要确定什么 |
| --- | --- | --- |
| `摔倒`、`跌倒`、`倒下`、`fall over`、`fall down` | 可能指播放动画、物理倒地或角色死亡 | 先明确用户预期，再决定关联动画、物理写法或提供组合示例。 |
| `倒计时`、`countdown` | 没有单独的倒计时 API，需要组合计时、等待、循环和变量 | 后续确定提供哪些写法或组合示例；本轮尚未把它绑定到某一个 API。 |
| `删除角色`、`删除精灵`、`delete sprite`、`remove sprite` | “隐藏”“死亡”“从项目删除”含义不同 | 本轮不再把这些词作为 `die` 的同义词；需要另行确认用户意图和可提供的行为。 |
| `分数`、`生命值`、`score`、`health` | 属于用变量保存、更新和显示数据的任务 | 变量声明可作为基础入口；赋值、增减及控件显示需要后续写法说明。 |
| 更多基础语法 | 仓库还已有带序号遍历、条件循环、范围循环、导入包等片段，当前面板未收录 | 后续确认是否加入；本轮仅新增已讨论的变量声明、函数定义。 |

## 核对范围

已逐项对照全部 148 条本地可用定义的名称、参数写法、功能说明和精灵／舞台范围，清单中的中英文关键词均已通过实际搜索函数核对。关键词仍是按初学者习惯拟定的建议，尚未经过用户可用性测试。

来源：[Reference 条目及对象过滤](../../spx-gui/src/components/editor/spx-code-editor/api-reference/index.ts)、[当前关键词配置](../../spx-gui/src/components/editor/spx-code-editor/api-reference/search-keywords.ts)、[API 功能说明](../../spx-gui/src/components/editor/spx-code-editor/document-base/index.ts)、[基础语法说明](../../spx-gui/src/components/xgo-code-editor/document-base/xgo.ts)、[搜索匹配规则](../../spx-gui/src/components/xgo-code-editor/ui/api-reference/search.ts)。
