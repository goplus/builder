<script lang="ts">
export function getDefaultValue() {
  return ''
}
</script>

<script setup lang="ts">
import { UITextInput } from '@/components/ui'

defineProps<{
  value: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()
</script>

<template>
  <UITextInput :value="value" @update:value="(v) => emit('update:value', v)" />
</template>
