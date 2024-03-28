# Using Widgets

Widegs are custom elements that you can integrate seamlessly into your web applications. This document outlines the basic usage and setup of widgets to help you get started.

## Widgets

| Widget Name  | Parameters           | Functions                                                  |
|--------------|----------------------|------------------------------------------------------------|
| `spx-runner` | `owner`, `name` | A widget that displays the SPX Game of the specified `owner`/`name`. It allows users to play the game interactively within the widget. |

## Setup

To use widgets in your web application, follow these simple steps:

### Element Placement

Insert the element into your HTML document where you want the project to appear.

```html
<div style="width: 500px; height: 500px;">
  <spx-runner owner="project-owner" name="project-name"></spx-runner>
</div>
```

- `width` and `height` can be adjusted to fit the desired size of your project display.

### Script Inclusion

Include the JavaScript file in your document by adding the following `script` tag:

```html
<script src="https://goplus-builder.qiniu.io/widgets/spx-runner.js" type="module"></script>
```

Now you should be able to see the widget in the right place on your web page.
