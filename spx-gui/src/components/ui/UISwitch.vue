<template>
  <NSwitch v-bind="rootBindings" @update:value="handleUpdateValue">
    <slot></slot>
  </NSwitch>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSwitch } from 'naive-ui'
import { useFormControl } from './form/useFormControl'

const props = defineProps<{
  value?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [boolean]
}>()

const { controlBindings, onChange } = useFormControl()
const rootBindings = computed(() => ({ ...props, ...controlBindings.value }))

function handleUpdateValue(v: boolean) {
  emit('update:value', v)
  onChange()
}
</script>
