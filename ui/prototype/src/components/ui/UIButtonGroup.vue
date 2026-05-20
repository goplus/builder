<template>
  <div :class="rootClass">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'

export type UIButtonGroupType = 'icon' | 'text'
export type UIButtonGroupVariant = 'primary' | 'secondary'

export const selectedValueInjectionKey: InjectionKey<() => string | undefined> = Symbol('selectedValue')
export const updateValueInjectionKey: InjectionKey<(value: string) => void> = Symbol('updateValue')
export const typeInjectionKey: InjectionKey<() => UIButtonGroupType> = Symbol('type')
export const variantInjectionKey: InjectionKey<() => UIButtonGroupVariant> = Symbol('variant')
</script>

<script setup lang="ts">
import { computed, provide } from 'vue'

const props = withDefaults(
  defineProps<{
    value?: string
    type?: UIButtonGroupType
    variant?: UIButtonGroupVariant
  }>(),
  {
    value: undefined,
    type: 'icon',
    variant: 'primary'
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

const rootClass = computed(() => [
  'ui-button-group',
  `ui-button-group-${props.variant}`,
  `ui-button-group-${props.type}`
])

provide(selectedValueInjectionKey, () => props.value)
provide(updateValueInjectionKey, (value: string) => {
  emit('update:value', value)
})
provide(typeInjectionKey, () => props.type)
provide(variantInjectionKey, () => props.variant)
</script>

<style scoped>
.ui-button-group {
  height: 32px;
  display: inline-flex;
  border-radius: var(--ui-border-radius-md);
}

.ui-button-group-primary {
  overflow: hidden;
  background: var(--ui-color-grey-300);
}

.ui-button-group-secondary {
  padding: 2px;
  background: var(--ui-color-grey-400);
}
</style>
