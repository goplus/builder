<template>
  <div class="ui-button-group-container">
    <slot></slot>
  </div>
</template>

<script lang="ts">
export const selectedValueInjectionKey: InjectionKey<() => string | undefined> =
  Symbol('selectedValue')
export const updateValueInjectionKey: InjectionKey<(value: string) => void> = Symbol('updateValue')
</script>

<script setup lang="ts">
import { provide, type InjectionKey } from 'vue'

const props = defineProps<{
  value?: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

provide(selectedValueInjectionKey, () => props.value)
provide(updateValueInjectionKey, (value: string) => {
  emit('update:value', value)
})
</script>

<style scoped lang="scss">
.ui-button-group-container {
  display: flex;
}
</style>
