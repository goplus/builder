# 摄像机 Camera

当舞台较大而游戏的显示区域较小时，我们无法把完整的舞台内容展示给用户，我们通过 Camera 来控制哪些区域的内容会被用户看到。

## 基本概念

### 舞台坐标 Stage Space

Stage Space 是游戏世界的原始坐标系，Sprite 位置或舞台大小等都是基于这个坐标系来定义的。

### 视口坐标 Viewport Space

Viewport Space 是相对于视口的坐标系，在视口中可见但不属于游戏世界的对象（如 [Widget](./widget.zh.md)），其位置是基于这个坐标系来定义的。

Camera 会决定 Stage Space 到 Viewport Space 的变换关系。

### 摄像机位置 Camera Position

Camera 的位置决定了视口的中心点，影响玩家所看到的游戏区域的位置。它是一个 Stage Space 中的坐标。

初始 Camera Position 默认为 (0,0)；我们将来可能会允许用户通过编辑器进行配置。

### 摄像机缩放比例 Camera Zoom

Camera Zoom 决定了视口所对应的游戏区域的大小。

Camera Zoom 为 1 时，舞台上（Stage Space）100x100 的区域在视口中（Viewport Space）大小也是 100x100。

初始 Camera Zoom 默认为 1；我们将来可能会允许用户通过编辑器进行配置。

### 舞台尺寸 Stage Size

舞台尺寸即游戏世界的大小，它决定了游戏中可用的空间，以及玩家可以探索的区域。

在 Stage Config 中我们允许用户配置舞台尺寸。我们也允许用户在运行时通过 `setStageSize` API 来动态调整舞台尺寸。

### 视口尺寸 Viewport Size

Viewport Size 决定了游戏视口的大小；Viewport Size 除以 Camera Zoom 就是视口对应的区域在 Stage Space 中的大小。

Viewport Size 当前保持为默认的 480x360；我们将来可能会允许用户通过编辑器进行配置。

以 Stage Size 1000x1000，Viewport Size 480x360，Camera Zoom 为 1、Camera Position 为 0,0（舞台中心）为例，视口中展示的是舞台中心 480x360 矩形区域对应的内容。

### 跟随 Follow

我们可以控制视口跟随某个目标精灵移动，以保持该精灵始终在视口中可见，这一功能称为 Follow。

### 舞台预览器 Stage Viewer

Stage Viewer 用于以视口的角度展示舞台内容。

### 地图编辑器 Map Editor

Map Editor 提供更全面的地图编辑功能，包括对整个地图的预览（支持缩放）、对地图尺寸的调整，以及选中精灵并对其基本属性（位置、转向等）进行就地编辑的能力。

Map Editor 不提供对 Widget 的预览与编辑。

## 相关 APIs

### Camera APIs

```go
type Game struct {
	Camera Camera
}

type Camera interface {
	Zoom() float64
	SetZoom(zoom float64)

	Xpos() float64
	Ypos() float64
	SetXYpos(x float64, y float64)

	Follow__0(target Sprite)
	Follow__1(target SpriteName)
}
```

### Stage APIs

```go
type Game interface {
	SetStageSize(width, height float64)
}
```

### Mouse APIs

Mouse 相关 API（如 `MouseX`、`MouseY`）的位置均使用 Stage Space。

如 Sprite 代码

```spx
setXYpos mouseX, mouseY
```

会将 Sprite 移动到当前鼠标所在位置，而无须进行坐标系转换。

### Edge APIs

Edge 相关 API（如 `touching(Edge)`、`bounceOffEdge()`），其涉及的“边缘 Edge”均为舞台边缘而非视口边缘。

如 Sprite 代码

```spx
touching(Edge)
```

在 Sprite 接触到舞台边缘时表达式值为 `true`，而与 Sprite 是否在视口边缘无关。

## User Story

### 启用 Camera

所有项目都可以认为默认启用了 Camera，只是默认情况下视口刚好完整地展示舞台内容，因此感觉不到 Camera 的存在。

通过 Stage Editor 设置 Stage Size，或者通过运行时的 API 调整 Camera Zoom / Position，使得视口不能完整地展示舞台内容，则可以视作“启用了 Camera 功能”。

通过 Stage Viewer 可以直观地看到 Camera 的效果，并调整 Camera 的位置。

### 相机跟随主角

在舞台代码中：

```spx
Camera.follow Hero
```

### 点击移动与坐标转换

玩家点击屏幕，主角移动到点击对应的位置。在舞台代码中：

```go
onClick => {
  Hero.setXYpos mouseX, mouseY
}
```

### 动态缩放以突出战斗

战斗开始时拉近镜头，结束后恢复。在 Sprite 代码中：

```go
onMsg "fight", => {
  zoom := Camera.zoom
  Camera.setZoom zoom*1.4
  animateAndWait "fight"
  Camera.setZoom zoom
}
```
