<template>
  <NInputNumber
    ref="nInput"
    class="ui-number-input"
    :placeholder="placeholder || ''"
    :show-button="false"
    :value="value"
    :disabled="disabled"
    :min="min"
    :max="max"
    @update:value="(v) => emit('update:value', v)"
  >
    <template v-if="!!slots.prefix" #prefix>
      <slot name="prefix"></slot>
    </template>
    <template v-if="!!slots.suffix" #suffix>
      <slot name="suffix"></slot>
    </template>
  </NInputNumber>
</template>

<script setup lang="ts">
import { onMounted, ref, useSlots } from 'vue'
import { NInputNumber } from 'naive-ui'

const props = defineProps<{
  value: number | null
  disabled?: boolean
  min?: number
  max?: number
  placeholder?: string
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:value': [number | null]
}>()

const slots = useSlots()

// It's wierd that the prop `autofocus` of `NInput` does not work as expected, so we handle it manually.
const nInput = ref<InstanceType<typeof NInputNumber> | null>(null)
onMounted(() => {
  if (props.autofocus && nInput.value != null) nInput.value.focus()
})
</script>

<style lang="scss" scoped>
.ui-number-input :deep(> .n-input) {
  // it's not possible to control input's hovered-bg-color with themeOverrides,
  // so we do background color control here
  &:not(.n-input--focus, .n-input--error-status, .n-input--disabled) {
    background-color: var(--ui-color-grey-300);
    &:hover {
      background-color: var(--ui-color-grey-400);
    }
  }

  .n-input__prefix {
    margin-right: 8px;
  }
}
</style>
