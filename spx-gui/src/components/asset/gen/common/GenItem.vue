<script lang="ts">
type LoadingStyle = {
  colorStop1: string
  colorStop2: string
  colorStop3: string
  genLoadingBgColor: string
}
</script>

<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItem, type Color } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    color: Color
    loading?: false | LoadingStyle
    pending?: false | string
    placeholder: string
  }>(),
  {
    loading: false,
    pending: false,
    loadingStyle: undefined
  }
)

const loadingStyle = computed(() =>
  props.loading
    ? {
        '--color-stop-1': props.loading.colorStop1,
        '--color-stop-2': props.loading.colorStop2,
        '--color-stop-3': props.loading.colorStop3,
        '--gen-loading-bg-color': props.loading.genLoadingBgColor
      }
    : {}
)

const pendingColor = computed(() =>
  props.pending
    ? {
        '--pending-color': props.pending
      }
    : {}
)
</script>

<template>
  <UIBlockItem
    class="gen-item"
    :class="{ loading, pending }"
    :style="[loadingStyle, pendingColor]"
    :color="color"
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
        var(--color-stop-1) 108deg,
        var(--color-stop-2) 125deg,
        var(--color-stop-3) 288deg
      );
      background-color: var(--gen-loading-bg-color);
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
      color: var(--pending-color);
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
