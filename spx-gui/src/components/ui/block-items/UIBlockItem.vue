<template>
  <div
    :class="[
      'ui-block-item',
      active && 'ui-block-item-active',
      interactive && 'ui-block-item-interactive',
      droppable && `ui-block-item-droppable-${droppable}`,
      `ui-block-item-${size}`
    ]"
    :style="style"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
/**
 * State for UIBlockItem as a droppable target.
 * - `accept`: the item of current dragging is acceptable
 * - `over`: the acceptable item is currently being dragged over
 */
export type DroppableState = 'accept' | 'over'

withDefaults(
  defineProps<{
    active?: boolean
    size?: 'medium' | 'large'
    interactive?: boolean
    droppable?: DroppableState | false
  }>(),
  {
    size: 'medium',
    interactive: true,
    droppable: false
  }
)

const style = {
  '--color-outline': 'var(--ui-color-primary-main)',
  '--color-background-active': 'var(--ui-color-primary-200)',
  '--color-background-default': 'var(--ui-color-primary-100)',
  '--color-background-hover': 'var(--ui-color-primary-200)'
}
</script>

<style>
@layer components {
  .ui-block-item {
    box-sizing: border-box;
    width: var(--block-item-size);
    height: var(--block-item-size);
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    border-radius: var(--ui-border-radius-md);
    padding: 2px;
    background-color: var(--ui-color-grey-100);
  }

  /*
   * Reserve 2px padding space for stable content layout;
   * draw the visible border with a pseudo element cuz its width changes on active state.
   */
  .ui-block-item::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid var(--ui-color-grey-400);
    border-radius: inherit;
    pointer-events: none;
  }

  .ui-block-item.ui-block-item-medium {
    --block-item-size: 88px;
  }

  .ui-block-item.ui-block-item-large {
    --block-item-size: 140px;
  }

  .ui-block-item.ui-block-item-interactive {
    cursor: pointer;
  }

  /* About `.drag-and-drop-disable-hover`: see `src/utils/drag-and-drop.ts` */
  .ui-block-item.ui-block-item-interactive:hover:not(.drag-and-drop-disable-hover):not(.ui-block-item-active) {
    background-color: var(--ui-color-grey-300);
  }

  .ui-block-item.ui-block-item-active {
    background-color: var(--color-background-active);
  }

  .ui-block-item.ui-block-item-active::before {
    border-width: 2px;
    border-color: var(--color-outline);
  }

  .ui-block-item.ui-block-item-active.ui-block-item-draggable {
    cursor: grab;
  }

  .ui-block-item.ui-block-item-droppable-accept {
    background-color: var(--ui-color-grey-400);
  }

  .ui-block-item.ui-block-item-droppable-accept::before {
    border-width: 2px;
    border-color: var(--ui-color-grey-400);
  }

  .ui-block-item.ui-block-item-droppable-over {
    animation: droppable-shaking 0.2s ease-in-out 2;
    background-color: var(--color-background-active);
  }

  .ui-block-item.ui-block-item-droppable-over::before {
    border-width: 2px;
    border-color: var(--color-outline);
  }
}

@keyframes droppable-shaking {
  0% {
    transform: scale(1.07) rotate(0deg);
  }
  25% {
    transform: scale(1.07) rotate(5deg);
  }
  50% {
    transform: scale(1.07) rotate(0deg);
  }
  75% {
    transform: scale(1.07) rotate(-5deg);
  }
  100% {
    transform: scale(1.07) rotate(0deg);
  }
}
</style>
