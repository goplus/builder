<script lang="ts">
function getResourceReferenceCls(suffix?: string) {
  return ['code-editor-resource-reference', suffix].filter(Boolean).join('-')
}

/**
 * Check if the element stands for icon of a modifiable resource reference.
 * If so, return the id of the resource reference.
 */
export function checkModifiable(el: HTMLElement): string | null {
  const clss = el.classList
  if (!clss.contains(getResourceReferenceCls('icon'))) return null
  if (!clss.contains(getResourceReferenceCls('modifiable'))) return null
  const idClsPrefix = getResourceReferenceCls('id-')
  for (const cls of clss) {
    if (cls.startsWith(idClsPrefix)) return cls.slice(idClsPrefix.length)
  }
  return null
}
</script>

<script setup lang="ts">
import { onUnmounted, watchEffect, ref } from 'vue'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import type { monaco } from '../../monaco'
import { toAbsolutePosition } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { isModifiableKind, type ResourceReferenceController } from '.'
import ResourceSelector from './selector/ResourceSelector.vue'

const props = defineProps<{
  controller: ResourceReferenceController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

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
    const clss = ['icon', `id-${item.id}`]
    if (isModifiableKind(item.kind)) {
      clss.push('modifiable')
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

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })

watchEffect(() => {
  const { modifying, selector } = props.controller
  if (modifying == null || selector == null) {
    dropdownVisible.value = false
    return
  }
  const aPos = toAbsolutePosition(modifying.range.start, codeEditorUICtx.ui.editor)
  if (aPos == null) {
    dropdownVisible.value = false
    return
  }
  dropdownVisible.value = true
  dropdownPos.value = {
    x: aPos.left,
    y: aPos.top,
    width: 0,
    height: aPos.height
  }
})
</script>

<template>
  <UIDropdown
    :visible="dropdownVisible"
    trigger="manual"
    :pos="dropdownPos"
    placement="bottom-start"
    :offset="{ x: 0, y: 4 }"
  >
    <ResourceSelector
      v-if="controller.selector != null"
      :selector="controller.selector"
      @cancel="controller.stopModifying()"
      @selected="(newName) => controller.applySelected(newName)"
    />
  </UIDropdown>
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
    // TODO: different icon for different type of resource. https://github.com/goplus/builder/issues/1259
    content: url(./icons/resource.svg);
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    transform: translate(-50%, -50%) scale(0.8);
    filter: opacity(0.4);
    cursor: not-allowed;
  }
  &.code-editor-resource-reference-modifiable::after {
    filter: opacity(0.6);
    cursor: pointer;
  }
  &.code-editor-resource-reference-modifiable:hover::after {
    filter: opacity(1);
  }
}
</style>
