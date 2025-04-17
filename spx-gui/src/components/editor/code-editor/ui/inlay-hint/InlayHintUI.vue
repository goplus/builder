<script setup lang="ts">
import type { monaco } from '../../monaco'
import { useDecorations } from '../common'
import { InlayHintKind, type InlayHintController } from '.'

const props = defineProps<{
  controller: InlayHintController
}>()

useDecorations(() => {
  const items = props.controller.items
  if (items == null) return []

  const decorations: monaco.editor.IModelDeltaDecoration[] = []
  for (const item of items) {
    if (item.kind === InlayHintKind.Parameter) {
      decorations.push({
        range: {
          startLineNumber: item.position.line,
          startColumn: item.position.column,
          endLineNumber: item.position.line,
          endColumn: item.position.column + 1 // TODO: any bettter way?
        },
        options: {
          isWholeLine: false,
          before: {
            content: `${item.label}: `,
            attachedData: item,
            inlineClassName: 'code-editor-inlay-hint-label',
            inlineClassNameAffectsLetterSpacing: true
          }
        }
      })
    }
  }
  return decorations
})
</script>

<template>
  <div></div>
</template>

<style lang="scss">
.code-editor-inlay-hint-label {
  color: var(--ui-color-hint-2) !important;
}
</style>
