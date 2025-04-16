<script lang="ts">
export function getDefaultValue() {
  return 0
}
</script>

<script setup lang="ts">
import { UINumberInput } from '@/components/ui'

defineProps<{
  value: number
}>()

const emit = defineEmits<{
  'update:value': [number]
}>()
</script>

<template>
  <UINumberInput :value="value" @update:value="(v) => emit('update:value', v ?? getDefaultValue())" />
</template>
