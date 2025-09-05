<!-- 

# Questions

* 是否存在“游戏的总代码”和“场景的代码”？如果是，二者的编辑入口分别是？

  是
  
  游戏的总代码不支持直接编辑，只能够通过 UI 定义（全局）变量

  场景的代码可以在各自的舞台编辑器中编辑。

* 是否支持精灵实例跨场景存在？

  暂不支持
  
  会导致精灵代码比较复杂，开发者需要考虑同一个精灵在不同场景下的逻辑，精灵对不同场景公共状态（变量）的读写也会比较复杂

  我们把功能简化为，精灵的定义是在场景内的，精灵的实例自然也在场景的生命周期内。
  
  我们提供跨场景复制精灵的功能，以便复用角色的代码或素材

* 离开场景后是否支持保持状态（用于下次进入）？

  暂不支持

  如果支持，开发者需要处理：

  - 场景状态的保持或重置
  - 处理（场景）局部状态与全局状态的不一致

  因此我们处理为：离开场景后，场景实例会被销毁；下次进入会重新构造并初始化。

-->

# 场景 Scene

“场景”用于把一个游戏拆分为多个逻辑单元，如“主菜单”“关卡一”“结算页”等，便于组织内容与跳转。

## 基本概念

### 项目 Project

我们对现有的 Project Game 内容进行调整，在 Stage、Sprite 等游戏元素之上增加一层抽象，即 Scene。

调整后的 Project Game 内容如下：

* Script: 脚本，全局的逻辑定义，典型的作用是定义跨场景的共享状态
* Scenes: 场景列表，一个 Project 可以对应 1 个或多个 Scene
* Sounds: Sound 列表，一个 Project 可以对应 0 个或多个 Sound
* Config: 其他配置信息，如默认 Scene 的选用、Viewport Size 等

### 场景 Scene

游戏中的一个页面/片段/关卡单位，包括以下信息：

* Name: 场景名，在 Project 中唯一
* Stage: 舞台信息，游戏运行时全局的状态、逻辑、背景等信息包含在 Stage 中；一个 Scene 对应一个 Stage
* Sprites: 精灵列表，一个 Scene 可以对应 0 个或多个 Sprite
* Zorder: Z 轴顺序，记录了当前 Scene 中所有的 Sprite（以及其他特殊内容）的在 Z 轴的顺序，即渲染时的层级
* Config: 其他配置信息，如 Camera 等

注意在游戏运行时，每个 Sprite 实例的生命周期与所属的 Scene 有关：

* 仅当 Scene 被初始化后，对应的 Sprite 实例才会被创建并初始化
* 当 Scene 被销毁时，所有属于该 Scene 的 Sprite 实例也会被销毁

## 相关 APIs

```go
type SceneName = string

type Game interface {
  StartScene__0(name SceneName)
  // StartScene__1(name SceneName, data any)
}

type Scene interface {
  Game
  OnStart__0(callback func())
  // OnStart__1(callback func(data any))
  OnExit(callback func())
}
```

## User Story

### 创建多场景项目（菜单→关卡→结算）

目标：从主菜单进入关卡，通关后进入结算，并带上分数。

步骤：
1. 在项目中新增三个 Scene：`menu`（初始）、`level1`、`result`，分别配置各自的 Stage（背景、精灵、脚本等）。
2. 在全局脚本中定义分数

  ```spx
  var score int
  ```

3. 在 `menu` 中开始按钮对应的 Sprite 代码中：
  
  ```spx
  onClick => {
    startScene "level1"
  }
  ```

4. 在 `level1` 的舞台脚本中，通关后设置分数并跳转到 `result`：

  ```spx
  score = 100
  startScene "result"
  ```

5. 在 `result` 的舞台脚本中，在 `onStart` 读取分数并展示：

  ```spx
  say "你的分数是: " + score
  ```
