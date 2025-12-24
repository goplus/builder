<template>
  <NInput
    ref="nInput"
    class="ui-text-input"
    :placeholder="placeholder || ''"
    :value="value"
    :type="type"
    :disabled="disabled"
    :readonly="readonly"
    :resizable="false"
    @update:value="(v) => emit('update:value', v)"
  >
    <template v-if="!!slots.prefix" #prefix>
      <slot name="prefix"></slot>
    </template>
    <template v-if="(value && clearable) || !!slots.suffix" #suffix>
      <div v-if="value && clearable" class="clear" @click="emit('update:value', '')">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6.70713 5.99999L9.35363 3.35347C9.54913 3.15847 9.54913 2.8415 9.35363 2.6465C9.15813 2.451 8.84212 2.451 8.64663 2.6465L6.00013 5.29299L3.35363 2.6465C3.15813 2.451 2.84212 2.451 2.64662 2.6465C2.45112 2.8415 2.45112 3.15847 2.64662 3.35347L5.29312 5.99999L2.64662 8.6465C2.45112 8.8415 2.45112 9.15847 2.64662 9.35347C2.74412 9.45097 2.87213 9.49999 3.00013 9.49999C3.12813 9.49999 3.25613 9.45097 3.35363 9.35347L6.00013 6.70699L8.64663 9.35347C8.74412 9.45097 8.87213 9.49999 9.00013 9.49999C9.12813 9.49999 9.25613 9.45097 9.35363 9.35347C9.54913 9.15847 9.54913 8.8415 9.35363 8.6465L6.70713 5.99999Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <slot name="suffix"></slot>
    </template>
  </NInput>
</template>

<script setup lang="ts">
import { onMounted, ref, useSlots } from 'vue'
import { NInput } from 'naive-ui'

type Type = 'textarea' | 'text' | 'password'

const props = defineProps<{
  value: string
  type?: Type
  clearable?: boolean
  disabled?: boolean
  readonly?: boolean
  placeholder?: string
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

const slots = useSlots()

// It's wierd that the prop `autofocus` of `NInput` does not work as expected, so we handle it manually.
const nInput = ref<InstanceType<typeof NInput> | null>(null)
onMounted(() => {
  if (props.autofocus && nInput.value != null) nInput.value.focus()
})
</script>

<style lang="scss" scoped>
.ui-text-input {
  // it's not possible to control input's hovered-bg-color with themeOverrides,
  // so we do background color control here
  &:not(.n-input--focus, .n-input--error-status, .n-input--success-status) {
    background-color: var(--ui-color-grey-300);
  }
  &:not(.n-input--focus, .n-input--disabled):hover {
    background-color: var(--ui-color-grey-400);
  }
  &.n-input--success-status {
    :deep(.n-input__state-border) {
      border: 1px solid var(--ui-color-success-main);
    }
  }

  :deep(.n-input__prefix) {
    margin-right: 8px;
  }
}

.clear {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ui-color-grey-800);
  transition: background-color 0.2s;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  margin-right: -4px;

  &:hover {
    background-color: var(--ui-color-grey-400);
  }
  &:active {
    background-color: var(--ui-color-grey-500);
  }
}
</style>
