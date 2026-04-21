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

const { controlBindings, onBlur, onChange } = useFieldControlBindings()
const rootBindings = computed(() => ({
  ...props,
  ...controlBindings.value,
  onFocusoutCapture: handleRootFocusout
}))

function handleUpdateValue(v: Array<string | number>) {
  emit('update:value', v as string[])
  onChange()
}

function handleRootFocusout(event: FocusEvent) {
  const currentTarget = event.currentTarget
  if (!(currentTarget instanceof HTMLElement)) return
  // Moving focus between checkboxes inside the same group should not count as a
  // field blur. Only trigger form blur handling once focus actually leaves the group.
  if (event.relatedTarget instanceof Node && currentTarget.contains(event.relatedTarget)) return
  onBlur()
}
</script>
