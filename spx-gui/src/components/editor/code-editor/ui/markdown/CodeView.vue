<script setup lang="ts">
import { computed } from 'vue'
import { getHighlighter, theme, tabSize } from '@/utils/spx/highlighter'
import { useAsyncComputed } from '@/utils/utils'
import { useSlotText } from '@/utils/vnode'

const props = withDefaults(
  defineProps<{
    /** Only `spx` supported now. */
    language?: string
    mode: 'block' | 'inline'
  }>(),
  {
    language: 'spx'
  }
)

const childrenText = useSlotText()
const highlighter = useAsyncComputed(getHighlighter)

const codeHtml = computed(() => {
  if (highlighter.value == null) return ''
  const code = childrenText.value
  return highlighter.value.codeToHtml(code, {
    lang: props.language,
    structure: props.mode === 'block' ? 'classic' : 'inline',
    theme
  })
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <code v-if="mode === 'inline'" class="code-view" :style="{ tabSize }" v-html="codeHtml"></code>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-else class="code-view" :style="{ tabSize }" v-html="codeHtml"></div>
</template>

<style lang="scss" scoped>
.code-view {
  font-family: var(--ui-font-family-code);
}
</style>
