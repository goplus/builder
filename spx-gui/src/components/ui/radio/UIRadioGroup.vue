<template>
  <NRadioGroup v-bind="rootBindings" @update:value="handleUpdateValue">
    <slot></slot>
  </NRadioGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NRadioGroup } from 'naive-ui'
import { useFieldControlBindings } from '../form/field-control-bindings'

const props = defineProps<{
  value?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [string | null]
}>()

const { controlBindings, onBlur, onChange } = useFieldControlBindings()
const rootBindings = computed(() => ({
  ...props,
  ...controlBindings.value,
  onFocusoutCapture: handleRootFocusout
}))

function handleUpdateValue(v: string | null) {
  emit('update:value', v)
  onChange()
}

function handleRootFocusout(event: FocusEvent) {
  const currentTarget = event.currentTarget
  if (!(currentTarget instanceof HTMLElement)) return
  // Moving focus between radios inside the same group should not count as a
  // field blur. Only trigger form blur handling once focus actually leaves the group.
  if (event.relatedTarget instanceof Node && currentTarget.contains(event.relatedTarget)) return
  onBlur()
}
</script>
