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
}>()

const modelValue = useDebouncedModel<number | null>(
  () => props.value,
  (v) => emit('update:value', v ?? getDefaultValue())
)
</script>

<template>
  <UINumberInput v-model:value="modelValue" />
</template>
