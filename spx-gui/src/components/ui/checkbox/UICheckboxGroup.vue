<template>
  <NCheckboxGroup v-bind="rootBindings" @update:value="handleUpdateValue">
    <slot></slot>
  </NCheckboxGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NCheckboxGroup } from 'naive-ui'
import { useFieldControlBindings } from '../form/field-control-bindings'

const props = defineProps<{
  value?: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [string[]]
}>()

const { controlBindings, onChange } = useFieldControlBindings()
const rootBindings = computed(() => ({ ...props, ...controlBindings.value }))

function handleUpdateValue(v: Array<string | number>) {
  emit('update:value', v as string[])
  onChange()
}
</script>
