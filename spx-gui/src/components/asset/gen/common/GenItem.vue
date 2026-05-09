<script lang="ts" setup>
import { UIBlockItem } from '@/components/ui'

withDefaults(
  defineProps<{
    active?: boolean
    /** If loading is true, it means a task is in progress; if loading is false, it means it is waiting for user action. */
    loading?: boolean
    /** highlight will highlight the placeholder. */
    highlight?: boolean
    placeholder: string
  }>(),
  {
    active: false,
    loading: false,
    highlight: false
  }
)
</script>

<template>
  <UIBlockItem class="gen-item" :class="{ loading, highlight, active }" :active="active" size="medium">
    <div class="preview-wrapper">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="$slots.preview == null" class="placeholder" v-html="placeholder"></div>
      <slot v-else name="preview"></slot>
    </div>
    <slot></slot>
  </UIBlockItem>
</template>

<style scoped>
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes rotate-gradient {
  to {
    --angle: 360deg;
  }
}

.gen-item.loading::before {
  /* Force override UIBlockItem's border */
  border: none;
  content: '';
  position: absolute;
  inset: 0;
  padding: 2px;
  border-radius: inherit;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  background: conic-gradient(
    from var(--angle) at 50% 50%,
    #dcf7fa 100deg,
    #0bc0cf 288deg,
    rgba(243, 252, 253, 0.8) 324deg,
    #dcf7fa 360deg
  );
  background-position: center;
  background-repeat: no-repeat;
  background-size: 150% 150%;
  animation: rotate-gradient 3s linear infinite;
}

.gen-item.highlight .placeholder {
  color: var(--ui-color-primary-main);
}

.gen-item .preview-wrapper {
  margin-bottom: 5px;
  height: 60px;
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gen-item .placeholder {
  width: 24px;
  height: 24px;
  color: var(--ui-color-grey-700);
}
</style>
