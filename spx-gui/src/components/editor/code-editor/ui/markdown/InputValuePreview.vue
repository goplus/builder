<script setup lang="ts">
import { computed } from 'vue'
import { type Input, InputKind, InputType, getResourceModel, exprForInput } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import ResourceItem from '../resource/ResourceItem.vue'

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

const expr = computed(() => {
  if (parsedInput.value == null) return ''
  return exprForInput(parsedInput.value) ?? ''
})
</script>

<template>
  <div class="input-value-preview">
    <ResourceItem v-if="resourceModel != null" :resource="resourceModel" autoplay />
    <span v-else>{{ expr }}</span>
  </div>
</template>

<style lang="scss" scoped></style>
