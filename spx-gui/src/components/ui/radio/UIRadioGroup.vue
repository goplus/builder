<template>
  <NRadioGroup v-bind="rootBindings" @update:value="handleUpdateValue">
    <slot></slot>
  </NRadioGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NRadioGroup } from 'naive-ui'
import { useFormControl } from '../form/useFormControl'

const props = defineProps<{
  value?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [string | null]
}>()

const { controlBindings, onChange } = useFormControl()
const rootBindings = computed(() => ({ ...props, ...controlBindings.value }))

function handleUpdateValue(v: string | null) {
  emit('update:value', v)
  onChange()
}
</script>
