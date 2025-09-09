# Camera

When the stage is large and the game's display area is small, we cannot show the complete stage content to users. We use Camera to control which areas of content the users can see.

## Basic Concepts

### Stage Space

Stage Space is the original coordinate system of the game world. Sprite positions, stage size, and other elements are all defined based on this coordinate system.

### Viewport Space

Viewport Space is the coordinate system relative to the viewport. Objects that are visible in the viewport but do not belong to the game world (such as [Widget](./widget.md)) have their positions defined based on this coordinate system.

Camera determines the transformation relationship from Stage Space to Viewport Space.

### Camera Position

The Camera's position determines the center point of the viewport, affecting the location of the game area that players see. It is a coordinate in Stage Space.

The initial Camera Position defaults to (0,0); we may allow users to configure this through the editor in the future.

### Camera Zoom

Camera Zoom determines the size of the game area corresponding to the viewport.

When Camera Zoom is 1, a 100x100 area on the stage (Stage Space) will also be 100x100 in size in the viewport (Viewport Space).

The initial Camera Zoom defaults to 1; we may allow users to configure this through the editor in the future.

### Stage Size

Stage Size is the size of the game world, which determines the available space in the game and the areas that players can explore.

In Stage Config, we allow users to configure the stage size. We also allow users to dynamically adjust the stage size at runtime through the `setStageSize` API.

### Viewport Size

Viewport Size determines the size of the game viewport; Viewport Size divided by Camera Zoom is the size of the corresponding area in Stage Space.

Viewport Size currently remains at the default 480x360; we may allow users to configure this through the editor in the future.

Taking Stage Size 1000x1000, Viewport Size 480x360, Camera Zoom of 1, and Camera Position of 0,0 (stage center) as an example, the viewport shows the content corresponding to a 480x360 rectangular area at the center of the stage.

### Follow

We can control the viewport to follow a target sprite's movement to keep that sprite always visible in the viewport. This functionality is called Follow.

### Stage Viewer

Stage Viewer is used to display stage content from the viewport's perspective.

### Map Editor

Map Editor provides comprehensive map editing functionality, including preview of the entire map (with zoom support), adjustment of map size, and the ability to select sprites and edit their basic properties (position, direction, etc.) in place.

Map Editor does not provide preview and editing for Widgets.

## Related APIs

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

Mouse-related APIs (such as `MouseX`, `MouseY`) all use Stage Space for positioning.

For example, in Sprite code:

```spx
setXYpos mouseX, mouseY
```

This will move the Sprite to the current mouse position without requiring coordinate system conversion.

### Edge APIs

Edge-related APIs (such as `touching(Edge)`, `bounceOffEdge()`), the "edge" they refer to is always the stage edge, not the viewport edge.

For example, in Sprite code:

```spx
touching(Edge)
```

The expression evaluates to `true` when the Sprite touches the stage edge, regardless of whether the Sprite is at the viewport edge.

## User Story

### Enabling Camera

All projects can be considered to have Camera enabled by default, but in the default state, the viewport exactly displays the complete stage content, so the Camera's presence is not felt.

By setting Stage Size through Stage Editor, or adjusting Camera Zoom/Position through runtime APIs to make the viewport unable to fully display the stage content, this can be considered as "enabling Camera functionality".

Through Stage Viewer, you can intuitively see the Camera's effect and adjust the Camera's position.

### Camera Following the Main Character

In stage code:

```spx
Camera.follow Hero
```

### Click to Move and Coordinate Conversion

Players click the screen, and the main character moves to the position corresponding to the click. In stage code:

```go
onClick => {
  Hero.setXYpos mouseX, mouseY
}
```

### Dynamic Zoom to Highlight Combat

Zoom in when combat starts, and restore when it ends. In Sprite code:

```go
onMsg "fight", => {
  zoom := Camera.zoom
  Camera.setZoom zoom*1.4
  animateAndWait "fight"
  Camera.setZoom zoom
}
```