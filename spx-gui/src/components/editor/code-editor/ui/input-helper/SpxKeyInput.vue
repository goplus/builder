<script lang="ts">
export function getDefaultValue() {
  return key0
}
</script>

<script setup lang="ts">
import { useDebouncedModel } from '@/utils/utils'
import { key0 } from '@/utils/spx'
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
  (v) => emit('update:value', Math.floor(v ?? getDefaultValue()))
)
</script>

<template>
  <UINumberInput v-model:value="modelValue" />
</template>
