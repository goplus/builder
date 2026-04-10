<template>
  <div :class="rootClass" :style="rootStyle">
    <NInputNumber
      ref="nInput"
      v-bind="inputAttrs"
      class="ui-number-input w-full min-w-0"
      :placeholder="placeholder || ''"
      :show-button="false"
      :value="value"
      :disabled="disabled"
      :min="min"
      :max="max"
      @update:value="(v) => emit('update:value', v)"
    >
      <template v-if="slots.prefix != null" #prefix>
        <slot name="prefix"></slot>
      </template>
      <template v-if="slots.suffix != null" #suffix>
        <slot name="suffix"></slot>
      </template>
    </NInputNumber>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type StyleValue, useAttrs, useSlots } from 'vue'
import { NInputNumber } from 'naive-ui'

import { cn, type ClassValue } from './utils'

defineOptions({
  inheritAttrs: false
})

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

const attrs = useAttrs()
const slots = useSlots()
const rootClass = computed(() => cn('w-full min-w-0 rounded-md', attrs.class as ClassValue))
const rootStyle = computed(() => attrs.style as StyleValue)
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

// It's wierd that the prop `autofocus` of `NInput` does not work as expected, so we handle it manually.
const nInput = ref<InstanceType<typeof NInputNumber> | null>(null)
onMounted(() => {
  if (props.autofocus && nInput.value != null) nInput.value.focus()
})
</script>

<style scoped>
/* it's not possible to control input's hovered-bg-color with themeOverrides, */
/* so we do background color control here */
.ui-number-input :deep(> .n-input):not(.n-input--focus, .n-input--error-status, .n-input--disabled) {
  background-color: var(--ui-color-grey-300);
}
.ui-number-input :deep(> .n-input):not(.n-input--focus, .n-input--error-status, .n-input--disabled):hover {
  background-color: var(--ui-color-grey-400);
}
.ui-number-input :deep(> .n-input .n-input__prefix) {
  margin-right: 8px;
}
</style>
