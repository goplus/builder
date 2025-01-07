# `code-change`

Display a change to the code. The user may apply the change by clicking "Apply" button in the element.

NOTE: Instead of `<code-change>`, you should use `<pre is="code-change">` to properly wrap the code change.

## Attributes

### `file`

Text document URI, e.g., `file:///NiuXiaoQi.spx`

### `line`

The position (line number) to do code change, e.g., `10`.

### `remove-line-count`

The number of lines to remove, e.g., `3`. If omitted, no line will be removed.

### children

The new code to insert.

## Examples

### Basic example

```xml
<pre is="code-change" file="file:///NiuXiaoQi.spx" line="10" remove-line-count="3">
show

say "Hello, world!"
</pre>
```

This is a change to the code of sprite `NiuXiaoQi`. The original code of line 10, 11 & 12 will be removed. And the code to insert is `show\n\nsay "Hello, world!"\n`.
