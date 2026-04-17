<template>
  <button
    v-bind="controlBindings"
    class="ui-switch"
    :class="{
      'ui-switch--active': checked,
      'ui-switch--disabled': props.disabled
    }"
    role="switch"
    :aria-checked="checked"
    type="button"
    :disabled="props.disabled"
    @click="handleToggle"
    @blur="onBlur"
  >
    <span class="ui-switch__rail" aria-hidden="true">
      <span class="ui-switch__button"></span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormControl } from './form/useFormControl'

const props = defineProps<{
  value?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [boolean]
}>()

const { controlBindings, onBlur, onChange } = useFormControl()

const checked = computed(() => props.value === true)

function handleToggle() {
  if (props.disabled) return
  emit('update:value', !checked.value)
  onChange()
}
</script>

<style>
@layer components {
  .ui-switch {
    --ui-switch-rail-color: rgba(0, 0, 0, 0.14);
    --ui-switch-rail-color-active: var(--ui-color-primary-main);
    --ui-switch-button-color: #fff;
    --ui-switch-button-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.3), inset 0 0 1px 0 rgba(0, 0, 0, 0.05);
    --ui-switch-focus-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-color-primary-main) 20%, transparent);
    --ui-switch-rail-width: 40px;
    --ui-switch-rail-height: 22px;
    --ui-switch-button-size: 18px;
    --ui-switch-button-size-pressed: 24px;
    --ui-switch-offset: 2px;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--ui-switch-rail-width);
    height: var(--ui-switch-rail-height);
    padding: 0;
    border: none;
    background: transparent;
    vertical-align: middle;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    outline: none;
  }

  .ui-switch:focus {
    outline: none;
  }

  .ui-switch__rail {
    position: relative;
    display: block;
    width: var(--ui-switch-rail-width);
    height: var(--ui-switch-rail-height);
    overflow: hidden;
    border-radius: calc(var(--ui-switch-rail-height) / 2);
    background-color: var(--ui-switch-rail-color);
    transition:
      opacity 0.3s ease,
      background-color 0.3s ease,
      box-shadow 0.3s ease;
  }

  .ui-switch__button {
    position: absolute;
    top: var(--ui-switch-offset);
    left: var(--ui-switch-offset);
    display: block;
    width: var(--ui-switch-button-size-pressed);
    max-width: var(--ui-switch-button-size);
    height: var(--ui-switch-button-size);
    border-radius: calc(var(--ui-switch-button-size) / 2);
    background-color: var(--ui-switch-button-color);
    box-shadow: var(--ui-switch-button-shadow);
    transition:
      left 0.3s ease,
      max-width 0.3s ease,
      background-color 0.3s ease,
      box-shadow 0.3s ease,
      opacity 0.3s ease;
  }

  .ui-switch--active .ui-switch__rail {
    background-color: var(--ui-switch-rail-color-active);
  }

  .ui-switch--active .ui-switch__button {
    left: calc(100% - var(--ui-switch-button-size) - var(--ui-switch-offset));
  }

  .ui-switch:not(.ui-switch--disabled):active .ui-switch__button {
    max-width: var(--ui-switch-button-size-pressed);
  }

  .ui-switch--active:not(.ui-switch--disabled):active .ui-switch__button {
    left: calc(100% - var(--ui-switch-button-size-pressed) - var(--ui-switch-offset));
  }

  /*
   * Match the old Naive UI behavior: once the switch itself receives focus,
   * the rail should show the focus ring. Using `:focus` here intentionally
   * keeps the visual feedback on mouse/pointer focus too, instead of limiting
   * it to keyboard-only `:focus-visible`.
   */
  .ui-switch:focus .ui-switch__rail {
    box-shadow: var(--ui-switch-focus-shadow);
  }

  .ui-switch--disabled {
    cursor: not-allowed;
  }

  .ui-switch--disabled .ui-switch__rail {
    opacity: 0.5;
  }
}
</style>
