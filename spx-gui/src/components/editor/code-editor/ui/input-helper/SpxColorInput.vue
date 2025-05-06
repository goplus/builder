<script lang="ts">
export type ColorValue = [r: number, g: number, b: number, a: number]

export function getDefaultValue(): ColorValue {
  return [0, 0, 0, 1]
}
</script>

<script setup lang="ts">
import { UITextInput } from '@/components/ui'
import { useDebouncedModel } from '@/utils/utils'

// TODO: Update UI for this component

const props = defineProps<{
  value: ColorValue
}>()

const emit = defineEmits<{
  'update:value': [ColorValue]
}>()

const modelValue = useDebouncedModel(
  () => `rgba(${props.value.join(',')})`,
  (v) => {
    const rgba = v.match(/rgba?\(([^)]+)\)/)
    if (!rgba) {
      emit('update:value', getDefaultValue())
      return
    }
    const values = rgba[1].split(',').map((s) => parseInt(s, 10)) as ColorValue
    emit('update:value', values)
  }
)
</script>

<template>
  <UITextInput v-model:value="modelValue" />
</template>
