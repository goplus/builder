<template>
  <NSwitch v-bind="rootBindings" @update:value="handleUpdateValue">
    <slot></slot>
  </NSwitch>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSwitch } from 'naive-ui'
import { useFieldControlBindings } from './form/field-control-bindings'

const props = defineProps<{
  value?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [boolean]
}>()

const { controlBindings, onBlur, onChange } = useFieldControlBindings()
const rootBindings = computed(() => ({
  ...props,
  ...controlBindings.value,
  onFocusoutCapture: handleRootFocusout
}))

function handleUpdateValue(v: boolean) {
  emit('update:value', v)
  onChange()
}

function handleRootFocusout(event: FocusEvent) {
  const currentTarget = event.currentTarget
  if (!(currentTarget instanceof HTMLElement)) return
  if (event.relatedTarget instanceof Node && currentTarget.contains(event.relatedTarget)) return
  onBlur()
}
</script>
