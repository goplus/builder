<script setup lang="ts">
import { useSlots, type VNode, type VNodeChild } from 'vue'
import { getHighlighter, theme, tabSize } from '@/utils/spx/highlighter'
import { useAsyncComputed } from '@/utils/utils'

const props = withDefaults(
  defineProps<{
    /** Only `spx` supported now. */
    language?: string
  }>(),
  {
    language: 'spx'
  }
)

const slots = useSlots()

const codeHtml = useAsyncComputed(async () => {
  const defaultSlot = slots.default?.()
  const code = getTextForVNodeChild(defaultSlot)
  const highlighter = await getHighlighter()
  return highlighter.codeToHtml(code, {
    lang: props.language,
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
  <div class="code-view" :style="{ tabSize }" v-html="codeHtml"></div>
</template>

<style lang="scss" scoped></style>
