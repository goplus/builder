<script setup lang="ts">
import { UIIcon } from '@/components/ui'

defineProps<{
  /** Whether the ruler is currently measuring (highlights the face). */
  active?: boolean
  /**
   * Render the unusable variant: same card, a red slash across the icon, no interaction.
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
  <button type="button" class="ruler-toggle" :class="{ active, disabled }" :disabled="disabled" @click="emit('click')">
    <span class="ruler-toggle-face">
      <UIIcon type="ruler" />
    </span>
  </button>
</template>

<style scoped>
/* Ruler toggle: a white card whose inner face turns turquoise on hover and while measuring. */
.ruler-toggle {
  display: flex;
  padding: 2px;
  border: none;
  border-radius: 10px;
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-sm);
  cursor: pointer;
}

.ruler-toggle-face {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--ui-border-radius-md);
  color: var(--ui-color-grey-1000);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.ruler-toggle:hover .ruler-toggle-face,
.ruler-toggle.active .ruler-toggle-face {
  background: var(--ui-color-turquoise-200);
  color: var(--ui-color-turquoise-500);
}

/* Disabled: the icon greys out under a red slash; no hover feedback. */
.ruler-toggle.disabled {
  cursor: not-allowed;
}

.ruler-toggle.disabled .ruler-toggle-face,
.ruler-toggle.disabled:hover .ruler-toggle-face {
  background: none;
  color: var(--ui-color-grey-700);
}

.ruler-toggle.disabled .ruler-toggle-face::after {
  content: '';
  position: absolute;
  width: 26px;
  height: 2px;
  border-radius: 1px;
  background: var(--ui-color-red-500);
  transform: rotate(-45deg);
}
</style>
