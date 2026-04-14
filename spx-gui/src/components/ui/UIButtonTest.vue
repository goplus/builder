<template>
  <button
    class="ui-button-test"
    :class="{ disabled, loading }"
    :disabled="disabled || loading"
    :type="htmlType"
  >
    <div class="content">
      <UIIcon v-if="loading" class="icon" type="loading" />
      <UIIcon v-else-if="icon" class="icon" :type="icon" />
      <slot v-else name="icon"></slot>
      <slot></slot>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    icon?: IconType
    disabled?: boolean
    loading?: boolean
    htmlType?: 'button' | 'submit' | 'reset'
  }>(),
  {
    icon: undefined,
    disabled: false,
    loading: false,
    htmlType: 'button'
  }
)

const disabled = computed(() => props.disabled)
</script>

<style lang="scss" scoped>
.ui-button-test {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 0 4px 0;
  height: 40px; // Total height of 40px (36px content + 4px shadow offset)
  border-radius: 12px;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  .content {
    flex: 1;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 24px;
    border-radius: 12px;
    font-size: 15px;
    line-height: 1.6;
    gap: 8px;
    font-weight: normal;
    color: var(--ui-color-grey-100);
    background-color: var(--ui-color-primary-main);
    box-shadow: 0 4px var(--ui-color-primary-700);
    transition: inherit;
    font-family: var(--ui-font-family-main);
  }

  .icon {
    width: 18px;
    height: 18px;
  }

  &:hover:not(:disabled):not(.loading) {
    .content {
      background-color: var(--ui-color-primary-400);
    }
  }

  &:active:not(:disabled):not(.loading),
  &.loading {
    padding-bottom: 0;
    .content {
      box-shadow: none;
    }
  }

  &:disabled:not(.loading) {
    cursor: not-allowed;
    .content {
      // These colors are specifically requested in the design draft (via variables in colors.ts)
      color: var(--ui-color-primary-700); // Specified as $turquoise700
      background-color: var(--ui-color-grey-300); // Specified as $grey300
      box-shadow: 0 4px var(--ui-color-grey-500); // Specified as $grey500
    }
  }

  &:focus-visible {
    outline: 2px solid var(--ui-color-primary-700);
    outline-offset: 2px;
  }
}
</style>
