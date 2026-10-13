# Readiness

Coordinates reported async prerequisites within a Vue component subtree. The
module entry exports the API and `ReadinessProvider`.

## Usage

Create a Scope and use the Provider to select the subtree it tracks:

```vue
<script setup lang="ts">
import { createReadinessScope, ReadinessProvider } from './index'
import Editor from './Editor.vue'

const scope = createReadinessScope()

async function start(signal: AbortSignal) {
  await scope.untilReady(signal)
  // Use the ready subtree.
}
</script>

<template>
  <ReadinessProvider :scope="scope">
    <Editor />
  </ReadinessProvider>
</template>
```

Descendants report a loading ref, computed or getter to the nearest ancestor Scope
(true means pending work, false means ready):

```ts
import { ref } from 'vue'
import { useRegisterLoading } from './index'

const loading = ref(true)
useRegisterLoading(loading)
// Set loading.value = false when the async work finishes.
```

To establish a boundary for all descendants of a component, call
`const scope = useProvideReadiness()` in its setup instead. The Provider is useful
when only part of a component's subtree should participate. Consumers outside the
boundary can receive the Scope as a prop and call `untilReady()` directly.

## Behavior

- `scope.ready.value` is true once the boundary is mounted, all reported loading
  sources are false and child Scopes are ready. It may become false again.
- Nested Scopes register with their nearest parent. Parents aggregate children;
  children wait independently of their parent's prerequisites.
- Registrations are removed automatically on scope disposal. A disposed boundary
  reports false; callers cancel pending waits with their own AbortSignal.
- `useRegisterLoading` reports to an ancestor boundary, even when the same
  component also calls `useProvideReadiness`. The newly provided Scope is for
  descendants. With no ancestor boundary, registration is a no-op.

`untilReady(signal?)` first flushes pending Vue updates so descendants can mount and
register. It then waits for reported readiness and flushes the resulting DOM
updates. Readiness is rechecked because those updates may mount further async
descendants. Cancellation rejects the wait, including when the signal is already
aborted. Call `untilReady()` from an event or lifecycle callback; awaiting it in async
setup would prevent the boundary from mounting.

Readiness covers reported prerequisites only. It does not discover unregistered
async work or guarantee that the browser has painted a frame.
