# XGo Executor

This module runs one XGo project in an isolated Web Worker and WASM instance.
It is framework-neutral: callers select an optional framework and provide its
allowed frontend capabilities.

## Usage

```ts
import { XGoExecutor } from '@/utils/xgoexec'

const executor = new XGoExecutor({
  framework: null,
  onError: (phase, message) => console.error(phase, message),
  onExit: (reason) => console.log(reason)
})

await executor.run({ 'main.xgo': 'echo "Hello, XGo!"' })
```

`run` resolves after the program starts. Use `onExit` for its terminal state
and `stop` to terminate the Worker. `dispatchEvent` delivers a framework event
to an already running program.

`worker.ts` loads `xgoexec.wasm`. The WASM asset is built by
`tools/xgoexec-bundle` and copied by `spx-gui/build-wasm.sh`.
