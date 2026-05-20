<script setup lang="ts">
import { nextTick, ref, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    value: string
    placeholder?: string
    clearable?: boolean
    disabled?: boolean
    readonly?: boolean
    color?: 'default' | 'white'
    size?: 'medium' | 'large'
  }>(),
  {
    placeholder: '',
    clearable: false,
    disabled: false,
    readonly: false,
    color: 'default',
    size: 'medium'
  }
)

const emit = defineEmits<{
  'update:value': [string]
  keypress: [KeyboardEvent]
  focus: [FocusEvent]
  blur: [FocusEvent]
}>()

const slots = useSlots()
const inputRef = ref<HTMLInputElement | null>(null)

function updateValue(event: Event) {
  emit('update:value', (event.target as HTMLInputElement).value)
}

function clearValue() {
  if (props.disabled || props.readonly) return
  emit('update:value', '')
  void nextTick(() => inputRef.value?.focus())
}
</script>

<template>
  <div
    class="ui-text-input"
    :class="[`color-${color}`, `size-${size}`]"
    :data-disabled="disabled || undefined"
  >
    <div class="ui-text-input-wrapper">
      <span v-if="slots.prefix" class="ui-text-input-prefix">
        <slot name="prefix"></slot>
      </span>
      <input
        ref="inputRef"
        class="ui-text-input-native"
        :value="value"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        @input="updateValue"
        @keypress="emit('keypress', $event)"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
      <span v-if="clearable || slots.suffix" class="ui-text-input-suffix">
        <button
          v-if="clearable && value"
          class="ui-text-input-clear"
          type="button"
          aria-label="Clear search"
          @mousedown.prevent
          @click="clearValue"
        >
          <svg class="block size-3" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M6.70713 5.99999L9.35363 3.35347C9.54913 3.15847 9.54913 2.8415 9.35363 2.6465C9.15813 2.451 8.84212 2.451 8.64663 2.6465L6.00013 5.29299L3.35363 2.6465C3.15813 2.451 2.84212 2.451 2.64662 2.6465C2.45112 2.8415 2.45112 3.15847 2.64662 3.35347L5.29312 5.99999L2.64662 8.6465C2.45112 8.8415 2.45112 9.15847 2.64662 9.35347C2.74412 9.45097 2.87213 9.49999 3.00013 9.49999C3.12813 9.49999 3.25613 9.45097 3.35363 9.35347L6.00013 6.70699L8.64663 9.35347C8.74412 9.45097 8.87213 9.49999 9.00013 9.49999C9.12813 9.49999 9.25613 9.45097 9.35363 9.35347C9.54913 9.15847 9.54913 8.8415 9.35363 8.6465L6.70713 5.99999Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <slot name="suffix"></slot>
      </span>
    </div>
  </div>
</template>

<style scoped>
.ui-text-input {
  position: relative;
  display: inline-flex;
  width: 100%;
  min-width: 0;
  border-radius: var(--ui-border-radius-md);
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 22px;
  box-shadow: inset 0 0 0 1px var(--ui-input-border-color);
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
}

.ui-text-input.color-default {
  --ui-input-border-color: var(--ui-color-grey-300);
  background: var(--ui-color-grey-300);
}

.ui-text-input.color-white {
  --ui-input-border-color: var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
}

.ui-text-input.size-medium {
  height: 32px;
}

.ui-text-input.size-large {
  height: 40px;
}

.ui-text-input:not([data-disabled='true']):focus-within {
  --ui-input-border-color: var(--ui-color-primary-main);
}

.ui-text-input[data-disabled='true'] {
  cursor: not-allowed;
  color: var(--ui-color-disabled-text);
  background: var(--ui-color-disabled-bg);
}

.ui-text-input-wrapper {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex: 1 1 0;
  min-width: 0;
  align-items: center;
  overflow: hidden;
  padding: 0 12px;
}

.ui-text-input-prefix,
.ui-text-input-suffix {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-800);
}

.ui-text-input-prefix {
  margin-right: 8px;
}

.ui-text-input-suffix {
  margin-left: 4px;
}

.ui-text-input-native {
  width: 100%;
  min-width: 0;
  height: inherit;
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ui-color-grey-1000);
  caret-color: var(--ui-color-primary-main);
  font: inherit;
  line-height: inherit;
}

.ui-text-input-native::placeholder {
  color: var(--ui-color-grey-700);
}

.ui-text-input-clear {
  display: inline-flex;
  width: 20px;
  height: 20px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 9999px;
  outline: none;
  appearance: none;
  color: var(--ui-color-grey-800);
  background: transparent;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.ui-text-input-clear:hover {
  background: var(--ui-color-grey-400);
}

.ui-text-input-clear:active {
  background: var(--ui-color-grey-500);
}
</style>
