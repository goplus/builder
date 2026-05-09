<template>
  <label class="ui-checkbox" :class="{ checked, disabled: mergedDisabled }">
    <input
      v-bind="controlBindings"
      class="input"
      type="checkbox"
      :value="props.value"
      :checked="checked"
      :disabled="mergedDisabled"
      @change="handleChange"
      @blur="onBlur"
    />
    <span class="box" aria-hidden="true">
      <svg viewBox="0 0 12 12" class="icon">
        <path
          d="M9.46967 2.46967C9.76256 2.17678 10.2373 2.17678 10.5302 2.46967C10.823 2.76257 10.8231 3.23736 10.5302 3.53022L5.03022 9.03022C4.73736 9.32307 4.26257 9.323 3.96967 9.03022L1.46967 6.53022C1.17678 6.23732 1.17678 5.76256 1.46967 5.46967C1.76256 5.17678 2.23732 5.17678 2.53022 5.46967L4.49994 7.4394L9.46967 2.46967Z"
          fill="currentColor"
        />
      </svg>
    </span>
    <span v-if="$slots.default != null" class="label">
      <slot></slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useFieldControlBindings } from '../form/field-control-bindings'
import { checkboxGroupContextKey } from './UICheckboxGroup.vue'

const props = withDefaults(
  defineProps<{
    checked?: boolean
    value?: string
    disabled?: boolean
  }>(),
  {
    checked: false,
    value: undefined,
    disabled: false
  }
)

const emit = defineEmits<{
  'update:checked': [boolean]
}>()

const checkboxGroupContext = inject(checkboxGroupContextKey, null)
const { controlBindings, onBlur, onChange } = useFieldControlBindings()

const mergedDisabled = computed(() => props.disabled || checkboxGroupContext?.disabled.value === true)
const checked = computed(() => {
  if (checkboxGroupContext != null && props.value != null) {
    return checkboxGroupContext.value.value.includes(props.value)
  }
  return props.checked
})

function handleChange(event: Event) {
  if (mergedDisabled.value) return

  const nextChecked = (event.target as HTMLInputElement).checked
  if (checkboxGroupContext != null && props.value != null) {
    checkboxGroupContext.updateValue(props.value, nextChecked)
    return
  }

  if (nextChecked !== checked.value) {
    emit('update:checked', nextChecked)
    onChange()
  }
}
</script>

<style scoped>
@layer components {
  .ui-checkbox {
    position: relative;
    display: inline-flex;
    align-items: center;
    color: var(--ui-color-text);
    user-select: none;
    -webkit-user-select: none;
  }

  .ui-checkbox.disabled {
    color: var(--ui-color-disabled-text);
  }

  .input {
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: inherit;
    opacity: 0;
    z-index: 1;
    cursor: pointer;
  }
  .ui-checkbox.disabled .input {
    cursor: not-allowed;
  }

  .box {
    flex: none;
    width: 16px;
    height: 16px;
    border-radius: var(--ui-border-radius-sm);
    border: 1px solid var(--ui-color-grey-600);
    background: var(--ui-color-grey-100);
    color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition:
      border-color 0.3s ease,
      background-color 0.3s ease,
      color 0.3s ease;
  }
  .ui-checkbox.disabled .box {
    background: var(--ui-color-grey-300);
  }
  .ui-checkbox:not(.disabled):hover .box,
  .ui-checkbox:not(.disabled):focus-within .box {
    border-color: var(--ui-color-primary-main);
  }
  .ui-checkbox.checked .box {
    color: var(--ui-color-grey-100);
  }
  .ui-checkbox.checked:not(.disabled) .box {
    border-color: var(--ui-color-primary-main);
    background: var(--ui-color-primary-main);
  }
  .ui-checkbox.checked.disabled .box {
    border-color: var(--ui-color-primary-300);
    background: var(--ui-color-primary-300);
  }

  .icon {
    width: 12px;
    height: 12px;
    opacity: 0;
    transform: scale(0.5);
    transform-origin: center;
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }
  .ui-checkbox.checked .icon {
    opacity: 1;
    transform: scale(1);
  }

  .label {
    padding: 0 8px;
    font-size: var(--ui-font-size-base);
    line-height: 1;
  }
}
</style>
