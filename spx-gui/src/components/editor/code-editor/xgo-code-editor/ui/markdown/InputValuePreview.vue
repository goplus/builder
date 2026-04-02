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
    <div
      v-else-if="inputPreview?.key != null"
      class="inline-flex h-12.5 min-w-12.5 flex-col items-center justify-center rounded-[4px] border border-grey-500 bg-grey-200 px-2 py-1.25"
      style="box-shadow: 0 1px 0 0 var(--ui-color-grey-500)"
    >
      {{ $t(inputPreview.key) }}
    </div>
    <div v-else-if="inputPreview?.color != null" class="flex items-center gap-2 py-2.75">
      <i class="block h-5 w-5 rounded-[4px]" :style="{ backgroundColor: inputPreview.color }"></i>
      <span class="font-code text-12 text-title">{{ expr }}</span>
    </div>
    <div v-else-if="inputPreview?.text != null" class="text">{{ $t(inputPreview.text) }}</div>
    <!-- We are not using inline `CodeView` here because it does not properly highlight short expressions. -->
    <!-- TODO: optimize `CodeView` to support short expressions. -->
    <span v-else class="font-code">{{ expr }}</span>
  </div>
</template>
