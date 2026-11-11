# Runtime line highlighting

Simple Mode highlights execution progress in the currently displayed source file.
For each concurrent execution chain, select the innermost active position in that
file. Do not switch source files automatically.

- Calls to SPX APIs retain their user-code call site while waiting for completion.
- Calls into another sprite or the stage retain their call site in the caller's
  file. Viewing the callee's file shows its own innermost position.
- Same-file calls show the position inside the callee, replacing the caller's
  position until the callee returns. This also applies to recursion.
- `waitUntil Mushroom.IsMature()` retains the wait line while evaluating the
  condition in `Mushroom.spx` and between evaluations.
- Each execution chain contributes independently. Returning or unwinding removes
  its completed frames; ending execution clears its positions. Starting an
  asynchronous chain does not keep its completed parent alive.

`tools/ispx` enables ixgo's `TrackStack` option and accepts `.spx` positions. On
each execution event it selects the first position for each file from the
innermost-first stack, retaining the existing per-goroutine sequence watermarks.
The runner still sends complete `{file, line}` snapshots; the editor filters them
by the active document. The protocol does not expose stack frames to the UI.

Positions come from interpreter debug metadata and call instructions. This is a
live progress indication, not a guarantee that every fast statement will be
visible after the runner's UI update throttling.
