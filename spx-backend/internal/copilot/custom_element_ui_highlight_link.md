# `ui-highlight-link`

Display a link to specific UI element. When link clicked, the UI element will be highlighted and a tooltip will be shown with additional information.

## Attributes

### `path`

The path to the UI element, e.g., `navbar > dropdown`.

### `tooltip`

The text to display in the tooltip when the link is clicked. If not provided, no tooltip will be shown.

### children

The text to display in the link.

## Examples

### Basic example

```xml
<ui-highlight-link path="navbar > dropdown" tooltip="Hover me to see more">Project Dropdown</ui-highlight-link>
```

This is a link with text "Project Dropdown" to the corresponding dropdown element in the navbar. When link clicked, the dropdown will be highlighted and a tooltip "Hover me to see more" will be shown by the UI.
