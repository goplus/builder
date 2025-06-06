<template>
  <div class="ui-tab-radio-group">
    <slot />
  </div>
</template>

<script lang="ts">
export const radioGroupValueKey: InjectionKey<ComputedRef<string | undefined>> = Symbol('radioGroupValue')
export const updateRadioValueKey: InjectionKey<(value: string) => void> = Symbol('updateRadioValue')
</script>

<script setup lang="ts">
import { provide, type InjectionKey, computed, type ComputedRef } from 'vue'

const props = defineProps<{
  value?: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

const updateValue = (newValue: string) => {
  emit('update:value', newValue)
}

provide(
  radioGroupValueKey,
  computed(() => props.value)
)
provide(updateRadioValueKey, updateValue)
</script>

<style scoped lang="scss">
.ui-tab-radio-group {
  display: flex;
  padding: 2px;
  justify-content: center;
  align-items: center;

  border-radius: 8px;
  background: var(--ui-color-grey-400);
}
</style>
