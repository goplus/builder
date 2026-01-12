<script lang="ts">
type GenColor = {
  main: Color
  loading: {
    headColor: string
    tailColor: string
    traceColor: string
    activeTraceColor: string
  }
  highlightColor: string
}
</script>

<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItem, type Color } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    color: GenColor
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

const style = computed(() => {
  const { color } = props
  return {
    '--loading-head-color': color.loading.headColor,
    '--loading-tail-color': color.loading.tailColor,
    '--loading-trace-color': color.loading.traceColor,
    '--loading-active-trace-color': color.loading.activeTraceColor,
    '--highlight-color': color.highlightColor
  }
})
</script>

<template>
  <UIBlockItem
    class="gen-item"
    :class="{ loading, highlight, active }"
    :active="active"
    :style="style"
    :color="color.main"
    size="medium"
  >
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
    // Force override UIBlockItem's border-color when active
    border-color: transparent !important;

    &.active {
      &::before {
        background: conic-gradient(
          from var(--angle) at 50% 50%,
          var(--loading-active-trace-color) 0deg,
          var(--loading-head-color) 40deg,
          var(--loading-tail-color) 110deg,
          var(--loading-active-trace-color)
        );
      }
    }

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
        var(--loading-trace-color) 0deg,
        var(--loading-head-color) 40deg,
        var(--loading-tail-color) 110deg,
        var(--loading-trace-color) 160deg
      );
      animation: rotate-gradient 3s linear infinite;
    }

    @keyframes rotate-gradient {
      to {
        --angle: 360deg;
      }
    }
  }

  &.highlight {
    .placeholder {
      color: var(--highlight-color);
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
