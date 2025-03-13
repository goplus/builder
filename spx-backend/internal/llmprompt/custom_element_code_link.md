# `code-link`

Display a link to a code location in the project. By clicking on the link, the user will be navigated to the code location. A location can be a position or a range.

## Attributes

### `file`

Text document URI, e.g., `file:///NiuXiaoQi.spx`

### `position`

Format: `${line},${column}`, e.g., `10,20`. `line` & `column` are numbers start from 1. `1,1` means the first column of the first line.

### `range`

Format: `${startLine},${startColumn}-${endLine}${endColumn}`, e.g., `10,20-12,10`

`startLine`, `startColumn`, `endLine`, `endColumn` are numbers start from 1. `10,20-12,10` means the range from line 10, column 20 to line 12, column 10. The end position is exclusive.

### children

The text to display in the link.

## Examples

### Basic example

```xml
<code-link file="file:///NiuXiaoQi.spx" position="10,20"></code-link>
```

This is a link to line 10, column 20 in the code of sprite `NiuXiaoQi`.

### Example with text

```xml
<code-link file="file:///main.spx" position="1,1">Details</code-link>
```

This is a link to the beginning of the code of stage with the text "Details".

### Example with range

```xml
<code-link file="file:///Stage.spx" range="2,1-2,10">onStart</code-link>
```

This is a link to a range (line 2, column 1 to line 2, column 10) in the code of stage with the text "onStart".
