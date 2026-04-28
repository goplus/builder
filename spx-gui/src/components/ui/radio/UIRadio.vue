<template>
  <label
    class="ui-radio"
    :class="{
      'ui-radio--checked': checked,
      'ui-radio--disabled': mergedDisabled
    }"
  >
    <input
      v-bind="controlBindings"
      class="ui-radio__input"
      type="radio"
      :name="radioGroupContext?.name"
      :value="props.value"
      :checked="checked"
      :disabled="mergedDisabled"
      @change="handleChange"
      @blur="onBlur"
    />
    <span class="ui-radio__dot" aria-hidden="true">
      <span class="ui-radio__dot-indicator"></span>
    </span>
    <span v-if="props.label != null || $slots.default != null" class="ui-radio__label">
      <slot>{{ props.label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useFieldControlBindings } from '../form/field-control-bindings'
import { radioGroupContextKey } from './UIRadioGroup.vue'

const props = defineProps<{
  checked?: boolean
  value?: string
  disabled?: boolean
  label?: string
}>()

const emit = defineEmits<{
  'update:checked': [boolean]
}>()

const radioGroupContext = inject(radioGroupContextKey, null)
const { controlBindings, onBlur, onChange } = useFieldControlBindings()

const mergedDisabled = computed(() => props.disabled || radioGroupContext?.disabled.value === true)
const checked = computed(() => {
  if (radioGroupContext != null) return radioGroupContext.value.value === (props.value ?? null)
  return props.checked === true
})

function handleChange() {
  if (mergedDisabled.value) return

  if (radioGroupContext != null) {
    if (props.value != null) radioGroupContext.updateValue(props.value)
    return
  }

  if (!checked.value) {
    emit('update:checked', true)
    onChange()
  }
}
</script>

<style>
@layer components {
  .ui-radio {
    position: relative;
    display: inline-flex;
    align-items: center;
    color: var(--ui-color-text);
    user-select: none;
    -webkit-user-select: none;
  }

  .ui-radio--disabled {
    color: var(--ui-color-disabled-text);
  }

  .ui-radio__input {
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: inherit;
    opacity: 0;
    z-index: 1;
    cursor: pointer;
  }
  .ui-radio--disabled .ui-radio__input {
    cursor: not-allowed;
  }

  .ui-radio__dot {
    flex: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid var(--ui-color-grey-600);
    background: var(--ui-color-grey-100);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition:
      border-color 0.3s ease,
      background-color 0.3s ease,
      box-shadow 0.3s ease;
  }
  .ui-radio:not(.ui-radio--disabled):hover .ui-radio__dot,
  .ui-radio:not(.ui-radio--disabled):focus-within .ui-radio__dot,
  .ui-radio--checked:not(.ui-radio--disabled) .ui-radio__dot {
    border-color: var(--ui-color-primary-main);
  }
  .ui-radio--checked.ui-radio--disabled .ui-radio__dot {
    border-color: var(--ui-color-primary-300);
  }
  .ui-radio--disabled:not(.ui-radio--checked) .ui-radio__dot {
    background: var(--ui-color-grey-300);
  }

  .ui-radio__dot-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--ui-color-primary-main);
    opacity: 0;
    transform: scale(0.8);
    transition: transform 0.3s ease;
  }
  .ui-radio--checked .ui-radio__dot-indicator {
    opacity: 1;
    transform: scale(1);
  }
  .ui-radio--checked.ui-radio--disabled .ui-radio__dot-indicator {
    background-color: var(--ui-color-primary-300);
  }

  .ui-radio__label {
    padding: 0 8px;
    font-size: var(--ui-font-size-base);
    line-height: 1;
  }
}
</style>
