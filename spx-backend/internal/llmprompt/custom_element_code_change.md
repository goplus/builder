# `code-change`

Display a modification based on the existing code.

**NOTE**:

* Prefer `code-change` over standard code block when showcasing code modifications.
* Use tabs to maintain indentation in the new code.
* Use `<pre is="code-change">` instead of `<code-change>`.

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

```xml
<pre is="code-change" file="file:///NiuXiaoQi.spx" line="10" remove-line-count="3">
onStart => {
	say "Hello, world!"
}
</pre>
```
