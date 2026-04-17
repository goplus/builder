<script lang="ts">
export function getDefaultValue() {
  return 0
}
</script>

<script setup lang="ts">
import AnglePicker from '@/components/editor/common/AnglePicker.vue'
import { UINumberInput } from '@/components/ui'

defineProps<{
  value: number
}>()

const emit = defineEmits<{
  'update:value': [number]
  submit: []
}>()

function handleValueUpdate(value: number | null) {
  emit('update:value', value ?? getDefaultValue())
}

function handleSubmit() {
  emit('submit')
}
</script>

<template>
  <div class="circle-container">
    <AnglePicker :model-value="value" @update:model-value="handleValueUpdate" />
  </div>
  <div class="flex items-center">
    <UINumberInput
      :value="value"
      class="w-15.5 self-stretch text-center"
      :min="-180"
      :max="180"
      autofocus
      @update:value="handleValueUpdate"
      @keyup.enter="handleSubmit"
    />
  </div>
</template>
