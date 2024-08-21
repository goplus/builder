<script setup lang="ts">
import MarkdownPreview from '@/components/editor/code-editor/ui/MarkdownPreview.vue'
defineProps<{
  content: string
}>()

const emits = defineEmits<{
  close: []
}>()
let timer: number | null = null

function handleMouseEnter() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function handleMouseLeave() {
  // classic ts type matches error between Browser timer and Node.js timer, god knows why 2024 still has this problem.
  // overview: https://stackoverflow.com/questions/45802988/typescript-use-correct-version-of-settimeout-node-vs-window
  // here use force transformed type.
  // or use `ReturnType<typeof setTimeout>`
  timer = setTimeout(() => emits('close'), 500) as unknown as number
}
</script>

<template>
  <markdown-preview
    class="document-preview"
    :content
    @mouseleave="handleMouseLeave"
    @mouseenter="handleMouseEnter"
  ></markdown-preview>
</template>

<style lang="scss" scoped>
.document-preview {
  width: fit-content;
}
</style>

<style lang="scss">
div[widgetid='editor.contrib.resizableContentHoverWidget'] {
  display: none !important;
}
</style>
