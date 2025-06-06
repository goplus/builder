<script lang="ts">
export function getDefaultValue() {
  return 0
}
</script>

<script setup lang="ts">
import { useDebouncedModel } from '@/utils/utils'
import { UINumberInput } from '@/components/ui'

const props = defineProps<{
  value: number
}>()

const emit = defineEmits<{
  'update:value': [number]
  submit: []
}>()

const [modelValue, flush] = useDebouncedModel<number | null>(
  () => props.value,
  (v) => emit('update:value', Math.floor(v ?? getDefaultValue()))
)

function handleSubmit() {
  flush()
  emit('submit')
}
</script>

<template>
  <UINumberInput v-model:value="modelValue" :style="{ alignSelf: 'stretch' }" autofocus @keyup.enter="handleSubmit" />
</template>
