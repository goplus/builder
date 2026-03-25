<script lang="ts">
import type { IInputHelperProvider } from '../../input-helper'

export function hasPreviewForInputType(type: string, provider: IInputHelperProvider | null): boolean {
  if (provider == null) return false
  return provider.provideInputTypeHandler(type) != null
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { InputKind, BuiltInInputType, type Input, type InputValueForType } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'

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
const resourceProvider = codeEditorCtx.ui.resourceProvider
const inputHelperProvider = codeEditorCtx.ui.inputHelperController.provider
const resourceIdentifier = computed(() => {
  if (parsedInput.value == null) return null
  if (parsedInput.value.type !== BuiltInInputType.ResourceName) return null
  const uri = parsedInput.value.value as InputValueForType<BuiltInInputType.ResourceName>
  return { uri }
})

const inputPreview = computed(() => {
  if (parsedInput.value == null) return null
  return inputHelperProvider?.provideInputValuePreview(parsedInput.value) ?? null
})

const expr = computed(() => {
  if (parsedInput.value == null) return ''
  const inputTypeHandler = inputHelperProvider?.provideInputTypeHandler(parsedInput.value.type)
  return inputTypeHandler?.exprForInput(parsedInput.value) ?? ''
})
</script>

<template>
  <div class="input-value-preview">
    <component
      :is="resourceProvider?.provideResourceItemRenderer()"
      v-if="resourceIdentifier != null"
      :resource="resourceIdentifier"
      autoplay
    />
    <component :is="() => inputPreview?.vnode" v-else-if="inputPreview?.vnode != null" />
    <div v-else-if="inputPreview?.key != null" class="key">{{ $t(inputPreview.key) }}</div>
    <div v-else-if="inputPreview?.color != null" class="color">
      <i class="color-preview" :style="{ backgroundColor: inputPreview.color }"></i>
      <span class="expr">{{ expr }}</span>
    </div>
    <div v-else-if="inputPreview?.text != null" class="text">{{ $t(inputPreview.text) }}</div>
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
