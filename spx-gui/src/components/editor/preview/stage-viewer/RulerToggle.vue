<script setup lang="ts">
import rulerIconUrl from '@/assets/images/triangle-ruler-button.svg?url&no-inline'

defineProps<{
  /** Whether the ruler is currently measuring (highlights the button). */
  active?: boolean
  /**
   * Render the unusable variant: muted surface and icon, with no interaction.
   * Shown over the running game, where measuring is not possible (the live sprite positions
   * belong to the engine).
   */
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="ruler-toggle"
    :class="{ active, disabled }"
    :disabled="disabled"
    :aria-label="$t({ en: 'Ruler', zh: '尺子' })"
    :aria-pressed="active"
    @click="emit('click')"
  >
    <img class="ruler-toggle-icon" :src="rulerIconUrl" alt="" draggable="false" />
  </button>
</template>

<style scoped>
/* The course ruler intentionally uses its own icon-button palette from the product design. */
.ruler-toggle {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  cursor: pointer;
  transition-property: background-color, border-color;
  transition-duration: 0.15s;
  transition-timing-function: ease;
}

.ruler-toggle-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  pointer-events: none;
}

.ruler-toggle:not(.active):not(:disabled):hover {
  background: var(--ui-color-grey-300);
}

.ruler-toggle.active {
  border-color: var(--ui-color-yellow-500);
  background: var(--ui-color-yellow-100);
}

.ruler-toggle:focus-visible {
  border: 2px solid var(--ui-color-turquoise-700);
  outline: none;
  background: var(--ui-color-grey-300);
}

.ruler-toggle:disabled {
  border-color: var(--ui-color-grey-400);
  background: var(--ui-color-grey-300);
  cursor: not-allowed;
}

.ruler-toggle:disabled .ruler-toggle-icon {
  opacity: 0.4;
}
</style>
