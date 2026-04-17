<template>
  <label
    class="ui-checkbox"
    :class="{
      'ui-checkbox--checked': checked,
      'ui-checkbox--disabled': mergedDisabled
    }"
  >
    <input
      v-bind="inputBindings"
      class="ui-checkbox__input"
      type="checkbox"
      :value="props.value"
      :checked="checked"
      :disabled="mergedDisabled"
      @change="handleChange"
      @blur="handleBlur"
    />
    <span class="ui-checkbox__box" aria-hidden="true">
      <svg viewBox="0 0 64 64" class="ui-checkbox__box-icon">
        <path
          d="M50.42,16.76L22.34,39.45l-8.1-11.46c-1.12-1.58-3.3-1.96-4.88-0.84c-1.58,1.12-1.95,3.3-0.84,4.88l10.26,14.51  c0.56,0.79,1.42,1.31,2.38,1.45c0.16,0.02,0.32,0.03,0.48,0.03c0.8,0,1.57-0.27,2.2-0.78l30.99-25.03c1.5-1.21,1.74-3.42,0.52-4.92  C54.13,15.78,51.93,15.55,50.42,16.76z"
          fill="currentColor"
        />
      </svg>
    </span>
    <span v-if="$slots.default != null" class="ui-checkbox__label">
      <slot></slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useFormControl } from '../form/useFormControl'
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
const { controlBindings, onBlur, onChange } = useFormControl()

const mergedDisabled = computed(() => props.disabled || checkboxGroupContext?.disabled.value === true)
const inputBindings = computed(() => (checkboxGroupContext == null ? controlBindings.value : {}))
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

function handleBlur() {
  if (checkboxGroupContext != null) return
  onBlur()
}
</script>

<style>
@layer components {
  .ui-checkbox {
    position: relative;
    display: inline-flex;
    align-items: center;
    color: var(--ui-color-text);
    user-select: none;
    -webkit-user-select: none;
  }

  .ui-checkbox--disabled {
    color: var(--ui-color-disabled-text);
  }

  .ui-checkbox__input {
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: inherit;
    opacity: 0;
    z-index: 1;
    cursor: pointer;
  }
  .ui-checkbox--disabled .ui-checkbox__input {
    cursor: not-allowed;
  }

  .ui-checkbox__box {
    flex: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
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
  .ui-checkbox--disabled .ui-checkbox__box {
    background: var(--ui-color-grey-300);
    color: var(--ui-color-disabled-text);
  }
  .ui-checkbox:not(.ui-checkbox--disabled):hover .ui-checkbox__box {
    border-color: var(--ui-color-primary-main);
  }
  .ui-checkbox--checked:not(.ui-checkbox--disabled) .ui-checkbox__box {
    border-color: var(--ui-color-primary-main);
    background: var(--ui-color-primary-main);
    color: var(--ui-color-grey-100);
  }

  .ui-checkbox__box-icon {
    width: 100%;
    opacity: 0;
    transform: scale(0.5);
    transform-origin: center;
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }
  .ui-checkbox--checked .ui-checkbox__box-icon {
    opacity: 1;
    transform: scale(1);
  }

  .ui-checkbox__label {
    padding: 0 8px;
    font-size: var(--ui-font-size-text);
    line-height: 1;
  }
}
</style>
