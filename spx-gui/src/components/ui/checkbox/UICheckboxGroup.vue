<template>
  <NCheckboxGroup v-bind="rootBindings" @update:value="handleUpdateValue">
    <slot></slot>
  </NCheckboxGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NCheckboxGroup } from 'naive-ui'
import { useFormControl } from '../form/useFormControl'

const props = defineProps<{
  value?: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [string[]]
}>()

const { controlBindings, onChange } = useFormControl()
const rootBindings = computed(() => ({ ...props, ...controlBindings.value }))

function handleUpdateValue(v: Array<string | number>) {
  emit('update:value', v as string[])
  onChange()
}
</script>
