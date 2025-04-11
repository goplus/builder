<script lang="ts">
function getCls(suffix?: string) {
  return ['code-editor-input-helper', suffix].filter(Boolean).join('-')
}

/**
 * Check if the element stands for icon of a input helper.
 * If so, return the id of the input helper item.
 */
 export function checkInputHelper(el: HTMLElement): string | null {
  const clss = el.classList
  if (!clss.contains(getCls('icon'))) return null
  const idClsPrefix = getCls('id-')
  for (const cls of clss) {
    if (cls.startsWith(idClsPrefix)) return cls.slice(idClsPrefix.length)
  }
  return null
}
</script>

<script setup lang="ts">
import { onUnmounted, watchEffect, ref, computed, nextTick, watch } from 'vue'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import type { monaco } from '../../monaco'
import { toAbsolutePosition, toMonacoRange, useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { InputHelperType, type InputHelperController, type InputHelperItem } from '.'
import StringInput from './StringInput.vue'
import NumberInput from './NumberInput.vue'
import BooleanInput from './BooleanInput.vue'
import ColorInput from './ColorInput.vue'
import { ValueType, type Value } from './common'

const props = defineProps<{
  controller: InputHelperController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

watch(() => props.controller.activeItems, async (activeItems) => {
  if (activeItems.length === 0) return
  await nextTick()
  props.controller['ui'].editor.setSelection(toMonacoRange({
    start: activeItems[0].range.end,
    end: activeItems[0].range.end
  }))
})

useDecorations(() => {
  const { items, hovered, activeItems } = props.controller
  if (items == null) return []

  const iconDecorations: monaco.editor.IModelDeltaDecoration[] = []
  for (const item of items) {
    // const isHovered = hovered != null && hovered.id === item.id
    const isActive = activeItems.some((activeItem) => activeItem.id === item.id)
    if (!isActive) continue
    const clss = ['icon', `id-${item.id}`]
    iconDecorations.push({
      range: {
        startLineNumber: item.range.start.line,
        startColumn: item.range.start.column,
        endLineNumber: item.range.end.line,
        endColumn: item.range.end.column
      },
      options: {
        isWholeLine: false,
        after: {
          content: ' ',
          inlineClassName: clss.map(getCls).join(' '),
          inlineClassNameAffectsLetterSpacing: true
        }
      }
    })
  }
  const bgDecorations: monaco.editor.IModelDeltaDecoration[] = []
  for (const item of items) {
    const clss = ['bg', `id-${item.id}`]
    const isActive = activeItems.some((activeItem) => activeItem.id === item.id)
    if (isActive) clss.push('active')
    bgDecorations.push({
      range: {
        startLineNumber: item.range.start.line,
        startColumn: item.range.start.column,
        endLineNumber: item.range.end.line,
        endColumn: item.range.end.column
      },
      options: {
        isWholeLine: false,
        inlineClassName: clss.map(getCls).join(' ')
      }
    })
  }
  return [...iconDecorations, ...bgDecorations]
  // return [...bgDecorations]
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

function getColorValue(str: string): Value<string> {
  return {
    type: ValueType.Literal,
    value: str.toLowerCase()
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
    case 'color':
      return getColorValue(str)
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

function handleCancelInput() {
  props.controller.stopInputing()
}
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
      @cancel="handleCancelInput"
    />
    <NumberInput
      v-if="controller.inputing != null && controller.inputing.type === InputHelperType.Number && currentValue != null"
      :value="currentValue"
      @submit="handleCurrentValueChange"
      @cancel="handleCancelInput"
    />
    <BooleanInput
      v-if="controller.inputing != null && controller.inputing.type === InputHelperType.Boolean && currentValue != null"
      :value="currentValue"
      @submit="handleCurrentValueChange"
      @cancel="handleCancelInput"
    />
    <ColorInput
      v-if="controller.inputing != null && controller.inputing.type === InputHelperType.Color && currentValue != null"
      :value="currentValue"
      @submit="handleCurrentValueChange"
      @cancel="handleCancelInput"
    />
  </UIDropdown>
</template>

<style lang="scss">
.code-editor-input-helper-icon {
  position: relative;
  // TODO: consider zooming of editor
  width: 14px;
  height: 18px;
  display: inline-block;
  margin-right: 2px;
  vertical-align: top;
}

.code-editor-input-helper-icon {
  &::after {
    content: url(./edit.svg);
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    transform: translate(-50%, -50%) scale(0.8);
    filter: opacity(0.6);
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.2);
  }
  &:hover::after {
    filter: opacity(1);
  }
}

.code-editor-input-helper-bg {
  /* position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%; */

  /* &::after {
    // TODO: different icon for different type of resource. https://github.com/goplus/builder/issues/1259
    content: url(./edit.svg);
    width: 16px;
    height: 16px;
    transform: translate(-50%, -50%) scale(0.8);
    filter: opacity(0.6);
    cursor: pointer;
    display: inline-block;
    width: 0;
    overflow: hidden;
  } */

  &:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }
  &.code-editor-input-helper-active {
    background-color: rgba(0, 0, 0, 0.3);
    /* color: var(--ui-color-hint-1) !important; */
    /* &::after {
      display: inline;
      width: auto;
    } */
  }
}
</style>
