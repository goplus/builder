<script lang="ts">
function getResourceReferenceCls(suffix?: string) {
  return ['code-editor-resource-reference', suffix].filter(Boolean).join('-')
}

export function checkSelectTrigger(el: HTMLElement): string | null {
  const clss = el.classList
  if (!clss.contains(getResourceReferenceCls('icon'))) return null
  if (!clss.contains(getResourceReferenceCls('selectable'))) return null
  const idClsPrefix = getResourceReferenceCls('id-')
  for (const cls of clss) {
    if (cls.startsWith(idClsPrefix)) return cls.slice(idClsPrefix.length)
  }
  return null
}
</script>

<script setup lang="ts">
import { onUnmounted, watchEffect } from 'vue'
import type { monaco } from '../common'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'
import { isSelectabe, type ResourceReferenceController } from '.'
import ResourceSelector from './selector/ResourceSelector.vue'

const props = defineProps<{
  controller: ResourceReferenceController
}>()

const codeEditorCtx = useCodeEditorCtx()

let dc: monaco.editor.IEditorDecorationsCollection | null = null
function getDecorationsCollection() {
  if (dc == null) dc = codeEditorCtx.ui.editor.createDecorationsCollection([])
  return dc
}

onUnmounted(() => {
  dc?.clear()
})

watchEffect(() => {
  const items = props.controller.items
  if (items == null) return

  const decorations = items.map<monaco.editor.IModelDeltaDecoration>((item) => {
    const clss = ['icon', `id-${item.id}`]
    if (isSelectabe(item)) {
      clss.push('selectable')
    }
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
          content: ' ',
          attachedData: item,
          inlineClassName: clss.map(getResourceReferenceCls).join(' '),
          inlineClassNameAffectsLetterSpacing: true
        }
      }
    }
  })
  getDecorationsCollection().set(decorations)
})
</script>

<template>
  <Teleport :to="controller.selectorWidgetEl">
    <ResourceSelector
      v-if="controller.selector != null"
      :selector="controller.selector"
      @cancel="controller.stopSelecting()"
      @selected="(newName) => controller.applySelected(newName)"
    />
  </Teleport>
</template>

<style lang="scss">
.code-editor-resource-reference-icon {
  position: relative;
  // TODO: consider zooming of editor
  width: 14px;
  height: 18px;
  display: inline-block;
  margin-right: 2px;
  vertical-align: top;
}

.code-editor-resource-reference-icon {
  &::after {
    // TODO: different icon for different type of resource
    content: url(./icons/resource.svg);
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    transform: translate(-50%, -50%) scale(0.8);
    filter: opacity(0.6);
  }
  &.code-editor-resource-reference-selectable::after {
    cursor: pointer;
  }
  &.code-editor-resource-reference-selectable:hover::after {
    filter: opacity(1);
  }
}
</style>
