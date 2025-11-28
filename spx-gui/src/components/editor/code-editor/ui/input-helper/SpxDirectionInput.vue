<script lang="ts">
export function getDefaultValue() {
  return 0
}
</script>

<script setup lang="ts">
import AnglePicker from '@/components/editor/common/AnglePicker.vue'
import { UINumberInput } from '@/components/ui'
import { exprForSpxDirection, valueForSpxDirection } from '@/utils/spx'

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

function formatter(value: number | null) {
  return exprForSpxDirection(value ?? getDefaultValue())
}

function parser(value: string) {
  return valueForSpxDirection(value) ?? Number(value)
}
</script>

<template>
  <div class="circle-container">
    <AnglePicker :model-value="value" @update:model-value="handleValueUpdate" />
  </div>
  <div class="input-container">
    <UINumberInput
      :value="value"
      class="input"
      :min="-180"
      :max="180"
      :style="{ alignSelf: 'stretch' }"
      autofocus
      :formatter="formatter"
      :parser="parser"
      @update:value="handleValueUpdate"
      @keyup.enter="handleSubmit"
    />
  </div>
</template>

<style lang="scss" scoped>
.input-container {
  display: flex;
  align-items: center;
}
.input {
  width: 62px;
  text-align: center;

  :deep(.n-input .n-input-wrapper) {
    // Correcting uneven left/right padding in UINumberInput
    // TODO: Dig and fix padding inconsistency in UINumberInput component
    padding-left: 8px;
    padding-right: 8px;
  }
}
</style>
