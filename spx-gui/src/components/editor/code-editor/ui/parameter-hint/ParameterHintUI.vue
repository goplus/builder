<script setup lang="ts">
import { onUnmounted, watchEffect } from 'vue'
import type { monaco } from '../../monaco'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { type ParameterHintController } from '.'

const props = defineProps<{
  controller: ParameterHintController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

function getCls(suffix?: string) {
  return ['code-editor-parameter-hint', suffix].filter(Boolean).join('-')
}

let dc: monaco.editor.IEditorDecorationsCollection | null = null
function getDecorationsCollection() {
  if (dc == null) dc = codeEditorUICtx.ui.editor.createDecorationsCollection([])
  return dc
}

onUnmounted(() => {
  dc?.clear()
})

watchEffect(() => {
  const items = props.controller.items
  if (items == null) return

  const decorations = items.map<monaco.editor.IModelDeltaDecoration>((item) => {
    return {
      range: {
        startLineNumber: item.range.start.line,
        startColumn: item.range.start.column,
        endLineNumber: item.range.end.line,
        endColumn: item.range.end.column
      },
      options: {
        isWholeLine: false,
        before: {
          content: `${item.name}: `,
          attachedData: item,
          inlineClassName: getCls('name'),
          inlineClassNameAffectsLetterSpacing: true
        }
      }
    }
  })
  getDecorationsCollection().set(decorations)
})
</script>

<template>
  <div></div>
</template>

<style lang="scss">
.code-editor-parameter-hint-name {
  /* margin-right: .4em; */
  color: var(--ui-color-hint-2) !important;
}
</style>
