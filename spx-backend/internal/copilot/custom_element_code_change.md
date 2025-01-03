# `code-change`

Display a change in the code. The change shows the difference between the original code and the new code. The user can apply the change by clicking "Apply" button in the element.

NOTE: Instead of `<code-change>`, you should use `<pre is="code-change">` to properly wrap the code change.

## Attributes

### `file`

Text document URI, e.g., `file:///NiuXiaoQi.spx`

### `line-range`

The range of the original code.

Format: `${startLine}-${endLine}`, e.g., `10-12`

`startLine`, `endLine` are numbers start from 1. `10-12` means the range from line 10 to line 12. The end line is exclusive.

### children

The new code.

## Examples

### Basic example

```xml
<pre is="code-change" file="file:///NiuXiaoQi.spx" line-range="10-12">
show
say "Hello, world!"
</pre>
```

This is a change in the code of sprite `NiuXiaoQi`. The original code is line 10 & line 11. The new code is `show\nsay "Hello, world!"\n`.
