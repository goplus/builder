# 物理引擎 Physics

为了方便在游戏中实现更真实的效果，我们内置物理引擎并将其能力提供给 XBuilder 用户。

用户可以通过简单的配置和脚本编写，轻松实现 Sprite 间的碰撞、重力、摩擦等物理效果。

## 相关概念

### 舞台 Stage

我们对 Stage Config 信息进行扩充如下：

* Physics: 物理引擎的全局配置，包括是否启用、重力、摩擦系数等

### 精灵 Sprite

我们对 Sprite Config 信息进行扩充如下：

* Physics: 对该精灵在物理引擎中的行为配置，包括 Physics Mode、重力、摩擦系数等

### 物理模式 Physics Mode

精灵的物理模式决定其在物理引擎中的行为。

我们提供以下 3 种模式：

* None: 没有任何物理引擎的效果（碰撞、重力等）
* Static: 物体不会移动，但会影响其他物体的移动
* Kinematic: 物体会被其他物体碰撞，但不受重力影响
* Dynamic: 物体会被其他物体碰撞，并受重力影响

## 相关 APIs

见 https://github.com/goplus/spx/pull/816
