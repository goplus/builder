# spx lifecycle

- Treat the context supplied by `spx.ExecuteNative` as scoped to the calling coroutine. Do not reuse it for work that
  must outlive that coroutine
- For background work that must outlive the calling coroutine without outliving its owner, use `spx.Go(owner, ...)`
  and run blocking work inside it with `spx.ExecuteNative`
- Do not use raw goroutines, `context.Background`, or `context.WithoutCancel` for owner-scoped work, and do not run
  blocking work directly inside `spx.Go`
- Test lifecycle behavior by canceling the caller context after scheduling and asserting the canonical final state, not
  only that a transport method was invoked
