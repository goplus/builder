<script lang="ts">
export function hasPreviewForInputType(type: InputType) {
  return [
    InputType.Integer,
    InputType.Decimal,
    InputType.String,
    InputType.Boolean,
    InputType.SpxResourceName,
    InputType.SpxEffectKind,
    InputType.SpxColor,
    InputType.SpxKey
  ].includes(type)
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import {
  cssColorStringForSpxColor,
  effectKinds,
  nameKeyMap,
  playActions,
  rotationStyles,
  specialDirections,
  specialObjs
} from '@/utils/spx'
import { type Input, InputKind, InputType, getResourceModel, exprForInput } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import ResourceItem from '../resource/ResourceItem.vue'
import SpxEffectKindItem from '../input-helper/spx-effect-input/SpxEffectKindItem.vue'

const props = defineProps<{
  input: string
}>()

const parsedInput = computed(() => {
  try {
    const input = JSON.parse(props.input) as Input
    if (input.kind === InputKind.Predefined) return null
    return input
  } catch (e) {
    console.warn('Failed to parse input:', e)
    return null
  }
})

const codeEditorCtx = useCodeEditorUICtx()
const resourceModel = computed(() => {
  if (parsedInput.value == null) return null
  if (parsedInput.value.type !== InputType.SpxResourceName) return null
  return getResourceModel(codeEditorCtx.ui.project, { uri: parsedInput.value.value })
})

const effectKind = computed(() => {
  if (parsedInput.value == null) return null
  if (parsedInput.value.type !== InputType.SpxEffectKind) return null
  return effectKinds.find((d) => d.name === parsedInput.value?.value)?.name ?? null
})

const key = computed(() => {
  if (parsedInput.value == null) return null
  if (parsedInput.value.type !== InputType.SpxKey) return null
  return nameKeyMap.get(parsedInput.value.value) ?? null
})

const color = computed(() => {
  if (parsedInput.value == null) return null
  if (parsedInput.value.type !== InputType.SpxColor) return null
  return cssColorStringForSpxColor(parsedInput.value.value)
})

const enumText = computed(() => {
  if (parsedInput.value == null) return null
  if (parsedInput.value.type === InputType.SpxDirection) {
    const value = parsedInput.value.value
    return specialDirections.find((d) => d.value === value)?.text ?? null
  }
  if (parsedInput.value.type === InputType.SpxPlayAction) {
    const value = parsedInput.value.value
    return playActions.find((d) => d.name === value)?.text ?? null
  }
  if (parsedInput.value.type === InputType.SpxSpecialObj) {
    const value = parsedInput.value.value
    return specialObjs.find((d) => d.name === value)?.text ?? null
  }
  if (parsedInput.value.type === InputType.SpxRotationStyle) {
    const value = parsedInput.value.value
    return rotationStyles.find((d) => d.name === value)?.text ?? null
  }
  return null
})

const expr = computed(() => {
  if (parsedInput.value == null) return ''
  return exprForInput(parsedInput.value) ?? ''
})
</script>

<template>
  <div class="input-value-preview">
    <ResourceItem v-if="resourceModel != null" :resource="resourceModel" autoplay />
    <SpxEffectKindItem v-else-if="effectKind != null" :name="effectKind" :active="false" :interactive="false" />
    <div v-else-if="key != null" class="key">{{ $t(key.text) }}</div>
    <div v-else-if="color != null" class="color">
      <i class="color-preview" :style="{ backgroundColor: color }"></i>
      <span class="expr">{{ expr }}</span>
    </div>
    <div v-else-if="enumText != null" class="text">{{ $t(enumText) }}</div>
    <span v-else class="expr">{{ expr }}</span>
  </div>
</template>

<style lang="scss" scoped>
.key {
  display: inline-flex;
  height: 50px;
  min-width: 50px;
  padding: 5px 8px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  border: 1px solid var(--ui-color-grey-500);
  background: var(--ui-color-grey-200);
  box-shadow: 0px 1px 0px 0px var(--ui-color-grey-500);
}

.color {
  display: flex;
  padding: 11px 0px;
  align-items: center;
  gap: 8px;

  .color-preview {
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 4px;
  }

  .expr {
    font-size: 12px;
    line-height: 1.5;
    color: var(--ui-color-title);
  }
}

.expr {
  // we are not using inline `CodeView` here because it does not properly highlight short expressions
  // TODO: optimize `CodeView` to support short expressions
  font-family: var(--ui-font-family-code);
}
</style>
