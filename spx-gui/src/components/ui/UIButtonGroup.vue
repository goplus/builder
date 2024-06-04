<template>
  <div class="ui-button-group-container">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'

const props = defineProps<{
  value?: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

const selectedValue = ref(props.value || '')

provide('selectedValue', selectedValue)
provide('updateValue', (value: string) => {
  selectedValue.value = value
  emit('update:value', value)
})
</script>

<style scoped lang="scss">
.ui-button-group-container {
  display: flex;
}
</style>
