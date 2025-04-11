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
import { UIDropdown, type DropdownPos, UIIconButton, UIIcon } from '@/components/ui'
import type { monaco } from '../../monaco'
import { toAbsolutePosition, toMonacoRange, useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { InputHelperType, type InputHelperController, type InputHelperItem } from '.'
import StringInput from './StringInput.vue'
import NumberInput from './NumberInput.vue'
import BooleanInput from './BooleanInput.vue'
import ColorInput from './ColorInput.vue'
import { ValueType, type Value } from './common'
import { timeout } from '@/utils/utils'

const props = defineProps<{
  controller: InputHelperController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

watch(() => props.controller['ui'].newlyInsertedRange, async () => {
  await timeout(100)
  const activeItems = props.controller.activeItems
  console.debug('activeItems', activeItems)
  if (activeItems.length === 0) return
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
    const isActiveInputing = item.id === props.controller.activeInputing?.id
    if (isActiveInputing) clss.push('active-inputing')
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
  // return [...iconDecorations, ...bgDecorations]
  return [...bgDecorations]
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

// =======

const activeDropdownVisible = ref(false)
const activeDropdownPos = ref<DropdownPos>({ x: 0, y: 0 })
const activeCurrentValue = computed<Value<any> | null>(() => {
  const { activeInputing } = props.controller
  if (activeInputing == null) return null
  return getValue(activeInputing)
})

async function handleActiveCurrentValueChange(newValue: Value<any>) {
  const { activeInputing } = props.controller
  if (activeInputing == null) return
  const td = codeEditorUICtx.ui.activeTextDocument
  if (td == null) return
  const newText = newValue.type === ValueType.Literal
    ? JSON.stringify(newValue.value)
    : newValue.name
  td.pushEdits([{
    range: activeInputing.range,
    newText
  }])
  await nextTick()
  props.controller.inputNextActiveItem()
}

watchEffect(() => {
  const { activeInputing } = props.controller
  if (activeInputing == null) {
    activeDropdownVisible.value = false
    return
  }
  const aPos = toAbsolutePosition({
    line: activeInputing.range.start.line,
    column: activeInputing.range.start.column + 1
  }, codeEditorUICtx.ui.editor)
  if (aPos == null) {
    activeDropdownVisible.value = false
    return
  }
  activeDropdownVisible.value = true
  activeDropdownPos.value = {
    x: aPos.left,
    y: aPos.top,
    width: 0,
    height: aPos.height
  }
})

function handleCancelActiveInput() {
  // props.controller.setActiveInputing(null)
}

function handleActiveInputPrev() {
  props.controller.inputPrevActiveItem()
}

function handleActiveInputNext() {
  props.controller.inputNextActiveItem()
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
  <UIDropdown
    :visible="activeDropdownVisible"
    trigger="manual"
    :pos="activeDropdownPos"
    placement="bottom"
  >
    <div class="active-dropdown">
      <UIIcon class="arrow-icon" type="arrowDown" style="transform: rotate(90deg);" @click="handleActiveInputPrev" />
      <StringInput
        v-if="controller.activeInputing != null && controller.activeInputing.type === InputHelperType.String && activeCurrentValue != null"
        :value="activeCurrentValue"
        @submit="handleActiveCurrentValueChange"
        @cancel="handleCancelActiveInput"
      />
      <NumberInput
        v-if="controller.activeInputing != null && controller.activeInputing.type === InputHelperType.Number && activeCurrentValue != null"
        :value="activeCurrentValue"
        @submit="handleActiveCurrentValueChange"
        @cancel="handleCancelActiveInput"
      />
      <BooleanInput
        v-if="controller.activeInputing != null && controller.activeInputing.type === InputHelperType.Boolean && activeCurrentValue != null"
        :value="activeCurrentValue"
        @submit="handleActiveCurrentValueChange"
        @cancel="handleCancelActiveInput"
      />
      <ColorInput
        v-if="controller.activeInputing != null && controller.activeInputing.type === InputHelperType.Color && activeCurrentValue != null"
        :value="activeCurrentValue"
        @submit="handleActiveCurrentValueChange"
        @cancel="handleCancelActiveInput"
      />
      <UIIcon class="arrow-icon" type="arrowDown" style="transform: rotate(-90deg);" @click="handleActiveInputNext" />
    </div>
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
    background-color: rgba(0, 0, 0, 0.1);
    /* color: var(--ui-color-hint-1) !important; */
    /* &::after {
      display: inline;
      width: auto;
    } */
  }
  &.code-editor-input-helper-active-inputing {
    background-color: rgba(0, 0, 0, 0.3);
  }
}
</style>

<style lang="scss" scoped>
.active-dropdown {
  display: flex;
  flex-direction: row;
  /* align-items: center; */
  justify-content: center;

  .arrow-icon {
    margin-top: 10px;
    width: 32px;
    height: 32px;
  }

  :deep(.header) {
    display: none;
  }
  :deep(.divider) {
    visibility: hidden;
  }
  :deep(button.type-boring) {
    display: none;
  }
}
</style>
