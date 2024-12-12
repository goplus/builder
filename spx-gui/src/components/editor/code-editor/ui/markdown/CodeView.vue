<script setup lang="ts">
import { computed, useSlots, type VNode, type VNodeChild } from 'vue'
import { getHighlighter, theme, tabSize } from '@/utils/spx/highlighter'
import { useAsyncComputed } from '@/utils/utils'

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

const slots = useSlots()
const highlighter = useAsyncComputed(getHighlighter)

const codeHtml = computed(() => {
  if (highlighter.value == null) return ''
  const defaultSlot = slots.default?.()
  const code = getTextForVNodeChild(defaultSlot)
  return highlighter.value.codeToHtml(code, {
    lang: props.language,
    structure: props.mode === 'block' ? 'classic' : 'inline',
    theme
  })
})

function getTextForVNodeChild(child: VNodeChild): string {
  if (child == null) return ''
  if (typeof child === 'string') return child
  if (Array.isArray(child)) return child.map(getTextForVNodeChild).join('')
  if (typeof child === 'object' && 'children' in child) return getTextForVNode(child)
  console.warn('getTextForVNodeChild: unknown node type', child)
  return ''
}

function getTextForVNode(vnode: VNode): string {
  const children = vnode.children
  if (children == null) return ''
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(getTextForVNodeChild).join('')
  console.warn('getTextForVNode: unknown node type', vnode)
  return ''
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <code v-if="mode === 'inline'" class="code-view" :style="{ tabSize }" v-html="codeHtml"></code>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-else class="code-view" :style="{ tabSize }" v-html="codeHtml"></div>
</template>

<style lang="scss" scoped></style>
