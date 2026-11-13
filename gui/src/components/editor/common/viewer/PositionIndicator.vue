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
  <div
    class="pointer-events-none absolute top-2 left-1/2 rounded-[4px] bg-black/30 px-1.5 py-0.5 text-xs text-white transition-opacity -translate-x-1/2"
    :class="visible ? 'opacity-100' : 'opacity-0'"
  >
    {{ position?.x ?? 0 }}, {{ position?.y ?? 0 }}
  </div>
</template>
