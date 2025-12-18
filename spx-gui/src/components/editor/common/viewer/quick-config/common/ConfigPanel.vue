<script lang="ts">
// TODO: Simple synchronization between fast-changing data and slow-changing data.
// This implementation cannot eliminate race conditions and may result in data overwriting.
// Improve when a better solution is available.
export function useSyncFastSlowValue<T>(fast: WatchSource<T>, slow: WatchSource<T>, cast: (value: T) => T = (v) => v) {
  const syncValue = ref<T>(cast(toValue<T>(slow)))
  function sync(value: T) {
    syncValue.value = cast(value)
  }
  watch(fast, sync)
  watch(slow, sync)

  return syncValue
}
</script>

<script lang="ts" setup>
import { ref, toValue, watch, type WatchSource } from 'vue'
</script>

<template>
  <div class="config-panel">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.config-panel {
  width: fit-content;
  height: 36px;
  border: 2px solid var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-big);
}
</style>
