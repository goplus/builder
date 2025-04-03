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
import { onUnmounted, watchEffect, ref, computed } from 'vue'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import type { monaco } from '../../monaco'
import { toAbsolutePosition } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { InputHelperType, type InputHelperController, type InputHelperItem } from '.'
import StringInput from './StringInput.vue'
import NumberInput from './NumberInput.vue'
import BooleanInput from './BooleanInput.vue'
import { ValueType, type Value } from './common'

const props = defineProps<{
  controller: InputHelperController
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
    const clss = ['icon', `id-${item.id}`, 'modifiable']
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

function getStringValue(str: string): Value<string> {
  if (str[0] === '"' && str[str.length - 1] === '"') {
    return {
      type: ValueType.Literal,
      value: str.slice(1, -1)
    }
  } else {
    return {
      type: ValueType.Identifier,
      name: str
    }
  }
}

function getNumberValue(str: string): Value<number> {
  if (/\d/.test(str[0])) {
    return {
      type: ValueType.Literal,
      value: parseFloat(str)
    }
  } else {
    return {
      type: ValueType.Identifier,
      name: str
    }
  }
}

function getBooleanValue(str: string): Value<boolean> {
  if (str.toLowerCase() === 'true') {
    return {
      type: ValueType.Literal,
      value: true
    }
  } else if (str.toLowerCase() === 'false') {
    return {
      type: ValueType.Literal,
      value: false
    }
  } else {
    return {
      type: ValueType.Identifier,
      name: str
    }
  }
}

function getValue(item: InputHelperItem): Value | null {
  const td = codeEditorUICtx.ui.activeTextDocument
  if (td == null) return null
  const str = td.getValueInRange(item.range)
  switch (item.type) {
    case 'string':
      return getStringValue(str)
    case 'number':
      return getNumberValue(str)
    case 'boolean':
      return getBooleanValue(str)
    default:
      throw new Error(`Unsupported type: ${item.type}`)
  }
}

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })
const currentValue = computed<Value<any> | null>(() => {
  const { inputing } = props.controller
  if (inputing == null) return null
  return getValue(inputing)
})

function handleCurrentValueChange(newValue: Value<any>) {
  const { inputing } = props.controller
  if (inputing == null) return
  const td = codeEditorUICtx.ui.activeTextDocument
  if (td == null) return
  const newText = newValue.type === ValueType.Literal
    ? JSON.stringify(newValue.value)
    : newValue.name
  td.pushEdits([{
    range: inputing.range,
    newText
  }])
  dropdownVisible.value = false
}

watchEffect(() => {
  const { inputing } = props.controller
  if (inputing == null) {
    dropdownVisible.value = false
    return
  }
  const aPos = toAbsolutePosition(inputing.range.start, codeEditorUICtx.ui.editor)
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
    <StringInput
      v-if="controller.inputing != null && controller.inputing.type === InputHelperType.String && currentValue != null"
      :value="currentValue"
      @submit="handleCurrentValueChange"
      @cancel="dropdownVisible = false"
    />
    <NumberInput
      v-if="controller.inputing != null && controller.inputing.type === InputHelperType.Number && currentValue != null"
      :value="currentValue"
      @submit="handleCurrentValueChange"
      @cancel="dropdownVisible = false"
    />
    <BooleanInput
      v-if="controller.inputing != null && controller.inputing.type === InputHelperType.Boolean && currentValue != null"
      :value="currentValue"
      @submit="handleCurrentValueChange"
      @cancel="dropdownVisible = false"
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
