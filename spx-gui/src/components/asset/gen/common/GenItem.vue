<script lang="ts" setup>
import { UIBlockItem } from '@/components/ui'

withDefaults(
  defineProps<{
    active?: boolean
    /** If loading is true, it means a task is in progress; if loading is false, it means it is waiting for user action. */
    loading?: boolean
    /** highlight will highlight the placeholder. */
    highlight?: boolean
    failed?: boolean
    ai?: boolean
    placeholder: string
  }>(),
  {
    active: false,
    loading: false,
    highlight: false,
    failed: false,
    ai: false
  }
)
</script>

<template>
  <UIBlockItem class="gen-item" :class="{ loading, highlight, active }" :active="active" size="medium">
    <div class="preview-wrapper">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="$slots.preview == null" class="placeholder" v-html="placeholder"></div>
      <slot v-else name="preview"></slot>
      <span
        v-if="failed"
        class="generation-failure-dot"
        role="img"
        :aria-label="$t({ en: 'Generation failed', zh: '生成失败' })"
      ></span>
    </div>
    <span v-if="ai" class="generation-ai-marker" aria-hidden="true">
      <svg viewBox="0 0 12 12">
        <path d="M6 0 7.5 4.5 12 6 7.5 7.5 6 12 4.5 7.5 0 6 4.5 4.5Z" fill="currentColor" />
      </svg>
    </span>
    <slot></slot>
  </UIBlockItem>
</template>

<style scoped>
.gen-item {
  width: 72px;
  height: 72px;
  --editor-card-corner-inset: 2px;
  --editor-card-corner-icon-size: 14px;
}

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
  position: relative;
  margin-bottom: 5px;
  height: 41px;
  width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gen-item .placeholder {
  width: 24px;
  height: 24px;
  color: var(--ui-color-grey-700);
}

.generation-failure-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  left: calc(50% + 6px);
  top: calc(50% - 14px);
  border-radius: 50%;
  background: var(--ui-color-red-500);
  outline: 2px solid var(--ui-color-grey-100);
}

.generation-ai-marker {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px 0 4px 0;
  color: var(--ui-color-grey-100);
  background: var(--ui-color-primary-main);
}

.generation-ai-marker svg {
  width: 8px;
  height: 8px;
}
</style>
