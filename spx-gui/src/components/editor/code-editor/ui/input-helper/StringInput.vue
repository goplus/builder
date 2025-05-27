<script lang="ts">
export function getDefaultValue() {
  return ''
}
</script>

<script setup lang="ts">
import { UITextInput } from '@/components/ui'
import { useDebouncedModel } from '@/utils/utils'

const props = defineProps<{
  value: string
}>()

const emit = defineEmits<{
  'update:value': [string]
  submit: []
}>()

const [modelValue, flush] = useDebouncedModel(
  () => props.value,
  (v) => emit('update:value', v)
)

function handleSubmit() {
  flush()
  emit('submit')
}
</script>

<template>
  <UITextInput v-model:value="modelValue" autofocus @keyup.enter="handleSubmit" />
</template>
