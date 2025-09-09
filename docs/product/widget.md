# Widget

In the game interface, besides Backdrop and Sprite, there is another type of visual element called Widget.

The elements corresponding to Widget are not part of the virtual "game world", which means:

* They do not participate in game behavior

  Widgets do not exist in the "game world", so they do not interact with the content (such as Sprite) in this world. If we integrate a physics engine in the future, the content corresponding to Widget should not be affected by it.

* Their positioning is relative to the viewport, not the map

  With the support of a camera in the future, the position or size of the content corresponding to Widget will not be affected by changes of the camera's perspective.

* Widgets will not be covered by the content in the game world, but will always cover the content in the game world.

Common widgets include, but are not limited to:

* Scoreboards, player information, mini-maps, etc., which display information from the game to the player.
* Text input boxes, sliders, etc., which help the player input information.
* Videos, web pages, etc., which embed complex external content into the game interface.

Compared to Sprites, users often have relatively weak customization requirements for the appearance and behavior of Widgets, and it is costly to implement them based on basic graphic drawing capabilities. Therefore, we organize common requirements, implement corresponding Widgets, and provide them to users for selection in a way that is high in abstraction, close to specific requirements, and low in customization capabilities.

## Basic Concepts

* Widget
* Monitor
* Stage

### Widget

Widgets are visual elements in the game interface that do not belong to the virtual "game world".

Based on their purpose and behavior, Widgets can be divided into different types. Currently, we will include some built-in Widget types. In the long run, we may also support users or third parties to implement Widget types and add them to projects (this expectation is far off).

The basic information of a Widget includes:

* Name: Unique within the Project it belongs to.
* Type: Type of widget. Builder determines the implementation logic of the Widget based on its Type.
* Basic Config: Basic configuration information. For Widgets of different Types, the structure of their Basic Config is the same, including:

  - X, Y: Position
  - Size: Size
  - Visible: Visibility

  It should be noted that for certain special Widget Types (such as always full-screen display), their position or size may not be customizable.

* Advanced Config: Advanced configuration information. The structure of the Advanced Config varies for Widgets of different Types.

  For example, for a scoreboard Widget, users will need to specify the variable value corresponding to "score" through advanced configuration.

### Monitor

Monitor is a type of Widget that displays a piece of data from the game in text form. Visually, a Monitor consists of two parts:

1. Label: The label that explains the meaning of the data.
2. Value: The value of the data.

Taking a scoreboard as an example, its Label may be "Score" and its Value may be the value of a global variable (such as `var score int`). Correspondingly, on the final interface, the Monitor will be rendered as a result like "Score: 90".

The Advanced Config of a Monitor includes:

* Label: Specifies the label information of the Monitor.
* Value: Specifies the source of the value of the Monitor.

  Currently, only specifying the name of a global variable as the source of the value is supported. The value of this global variable will be used as the value of the Monitor, and non-string types will be converted to strings before being displayed.

### Stage

On top of [XBuilder Product](./index.md), the Stage is extended as follows:

* Widgets: A list of Widgets. A Stage can contain 0 or more Widgets.

## User Story

### Adding Widgets to the Stage

Users can add Widgets to the Stage and need to select the Widget Type when adding.

After adding a Widget, users can adjust its Name, Basic Config, Advanced Config, and other information.

### Interacting with Widgets through Code

Both the code of the Stage and the Sprite can interact with the Widgets in the current Stage through the following interfaces:

```go
scoreMonitor := getWidget(Monitor, "score")
usernameInput := getWidget(Input, "usernameInput")

// `show` & `setXYPos` are basic methods provided by all types of Widgets
scoreMonitor.show
scoreMonitor.setXYPos 0, 0
// `onMsg` is a basic method, but the msg triggered by different types of Widgets (such as `"change"` here) is different
usernameInput.onMsg "change", value => {
  // ...
}

// `getValue` is a method specific to `Input`
username := usernameInput.getValue()
```

