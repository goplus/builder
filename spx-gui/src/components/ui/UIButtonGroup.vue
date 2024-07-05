<template>
  <div class="ui-button-group-container">
    <slot></slot>
  </div>
</template>

<script lang="ts">
export const selectedValueInjectionKey: InjectionKey<() => string | undefined> =
  Symbol('selectedValue')
export const updateValueInjectionKey: InjectionKey<(value: string) => void> = Symbol('updateValue')
export const typeInjectionKey: InjectionKey<() => Type> = Symbol('type')
</script>

<script setup lang="ts">
import { provide, type InjectionKey } from 'vue'

export type Type = 'icon' | 'text'

const props = withDefaults(
  defineProps<{
    value?: string
    /** Type of group-item content. */
    type?: Type
  }>(),
  {
    value: undefined,
    type: 'icon'
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

provide(selectedValueInjectionKey, () => props.value)
provide(updateValueInjectionKey, (value: string) => {
  emit('update:value', value)
})
provide(typeInjectionKey, () => props.type)
</script>

<style scoped lang="scss">
.ui-button-group-container {
  display: flex;
}
</style>
