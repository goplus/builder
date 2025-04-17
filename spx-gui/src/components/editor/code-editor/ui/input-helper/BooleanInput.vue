<script lang="ts">
export function getDefaultValue() {
  return true
}
</script>

<script setup lang="ts">
import { UISwitch } from '@/components/ui'

defineProps<{
  value: boolean
}>()

const emit = defineEmits<{
  'update:value': [boolean]
}>()
</script>

<template>
  <UISwitch :value="value" @update:value="(v) => emit('update:value', v)" />
</template>
