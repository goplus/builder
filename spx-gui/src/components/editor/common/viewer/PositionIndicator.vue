<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  position: { x: number; y: number } | null
}>()

const visible = ref(false)

watch(
  () => props.position,
  (pos, _, onCleanup) => {
    if (pos == null) {
      visible.value = false
      return
    }
    visible.value = true
    // auto hide if no position change
    const timer = setTimeout(() => {
      visible.value = false
    }, 2500)
    onCleanup(() => clearTimeout(timer))
  },
  { immediate: true }
)
</script>

<template>
  <div class="position-indicator" :class="{ visible }">{{ position?.x ?? 0 }}, {{ position?.y ?? 0 }}</div>
</template>

<style lang="scss" scoped>
.position-indicator {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 12px;
  border-radius: 4px;
  pointer-events: none;

  transition: opacity 0.2s;
  opacity: 0;
  &.visible {
    opacity: 1;
  }
}
</style>
