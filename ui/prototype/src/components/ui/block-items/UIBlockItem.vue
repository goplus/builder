<template>
  <button
    class="ui-block-item"
    :class="{ 'ui-block-item-active': active, 'ui-block-item-interactive': interactive }"
    type="button"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    active?: boolean
    interactive?: boolean
  }>(),
  {
    active: false,
    interactive: true
  }
)
</script>

<style scoped>
@layer components {
  .ui-block-item {
    box-sizing: border-box;
    position: relative;
    display: flex;
    width: 88px;
    height: 88px;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    border: 0;
    border-radius: var(--ui-border-radius-md);
    background: var(--ui-color-grey-100);
    padding: 2px;
    color: inherit;
  }

  .ui-block-item::before {
    position: absolute;
    inset: 0;
    border: 1px solid var(--ui-color-grey-400);
    border-radius: inherit;
    content: '';
    pointer-events: none;
  }

  .ui-block-item-interactive:hover:not(.ui-block-item-active) {
    background: var(--ui-color-grey-300);
  }

  .ui-block-item-active {
    background: var(--ui-color-primary-100);
  }

  .ui-block-item-active::before {
    border-width: 2px;
    border-color: var(--ui-color-primary-main);
  }
}
</style>
