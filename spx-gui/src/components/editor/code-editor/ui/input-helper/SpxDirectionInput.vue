<script lang="ts">
export function getDefaultValue() {
  return 0
}
</script>

<script setup lang="ts">
import { nomalizeDegree, useDebouncedModel } from '@/utils/utils'
import { UINumberInput } from '@/components/ui'

// TODO: Update UI for this component

const props = defineProps<{
  value: number
}>()

const emit = defineEmits<{
  'update:value': [number]
}>()

const modelValue = useDebouncedModel<number | null>(
  () => props.value,
  (v) => emit('update:value', Math.floor(nomalizeDegree(v ?? getDefaultValue())))
)
</script>

<template>
  <UINumberInput v-model:value="modelValue" :min="-180" :max="180" />
</template>
