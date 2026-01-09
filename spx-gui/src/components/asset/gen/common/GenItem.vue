<script lang="ts">
type GenColor = {
  color: Color
  loading: {
    headColor: string
    tailColor: string
    traceColor: string
    backgroundColor: string
  }
  pending: {
    highlightColor: string
  }
}
</script>

<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItem, type Color } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    genColor: GenColor
    loading?: boolean
    pending?: boolean
    placeholder: string
  }>(),
  {
    loading: false,
    pending: false
  }
)

const style = computed(() => {
  const { genColor } = props
  return {
    '--loading-head-color': genColor.loading.headColor,
    '--loading-tail-color': genColor.loading.tailColor,
    '--loading-trace-color': genColor.loading.traceColor,
    '--loading-bg-color': genColor.loading.backgroundColor,
    '--pending-highlight-color': genColor.pending.highlightColor
  }
})
</script>

<template>
  <UIBlockItem class="gen-item" :class="{ loading, pending }" :style="style" :color="genColor.color" size="medium">
    <div class="preview-wrapper">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="$slots.preview == null" class="placeholder" v-html="placeholder"></div>
      <slot v-else name="preview"></slot>
    </div>
    <slot></slot>
  </UIBlockItem>
</template>

<style lang="scss" scoped>
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.gen-item {
  &.loading {
    border-color: transparent;

    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      padding: 2px;
      border-radius: inherit;
      mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
      background: conic-gradient(
        from var(--angle) at 50% 50%,
        var(--loading-head-color) 108deg,
        var(--loading-tail-color) 125deg,
        var(--loading-trace-color) 288deg
      );
      background-color: var(--loading-bg-color);
      animation: rotate-gradient 2s linear infinite;
    }

    @keyframes rotate-gradient {
      to {
        --angle: 360deg;
      }
    }
  }

  &.pending {
    .placeholder {
      color: var(--pending-highlight-color);
    }
  }

  .preview-wrapper {
    margin-bottom: 5px;
    height: 60px;
    width: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .placeholder {
    width: 24px;
    height: 24px;
    color: var(--ui-color-grey-700);
  }
}
</style>
