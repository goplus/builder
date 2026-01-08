<script lang="ts">
type GenItemType = 'sound' | 'backdrop' | 'sprite' | 'animation' | 'costume'
</script>

<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItem, type Color } from '@/components/ui'

import littleGuySVG from './little-guy.svg?raw'
import animationSVG from './animation.svg?raw'
import backdropSVG from './backdrop.svg?raw'
import soundSVG from './sound.svg?raw'

const props = withDefaults(
  defineProps<{
    type: GenItemType
    loading?: boolean
    ready?: boolean
  }>(),
  {
    loading: false,
    ready: false
  }
)

const color = computed<Color>(() => {
  switch (props.type) {
    case 'costume':
    case 'animation':
      return 'primary'
    case 'sound':
      return 'sound'
    case 'backdrop':
      return 'stage'
    case 'sprite':
      return 'sprite'
    default:
      return 'primary'
  }
})

const placeholder = computed(() => {
  switch (props.type) {
    case 'costume':
    case 'sprite':
      return littleGuySVG
    case 'animation':
      return animationSVG
    case 'sound':
      return soundSVG
    case 'backdrop':
      return backdropSVG
    default:
      return littleGuySVG
  }
})

const loadingStyle = computed(() => {
  switch (props.type) {
    case 'costume':
    case 'animation':
      return {
        '--color-stop-1': 'var(--ui-color-turquoise-main)',
        '--color-stop-2': '#DCF7FA',
        '--color-stop-3': '#F3FCFD1A',
        '--gen-loading-bg-color': 'var(--ui-color-turquoise-main)',
        '--ready-color': 'var(--ui-color-turquoise-main)'
      }
    case 'sprite':
      return {
        '--color-stop-1': 'var(--ui-color-sprite-main)',
        '--color-stop-2': '#FFF0DC',
        '--color-stop-3': '#FFFAF51A',
        '--gen-loading-bg-color': 'var(--ui-color-sprite-main)',
        '--ready-color': 'var(--ui-color-sprite-main)'
      }
    case 'sound':
      return {
        '--color-stop-1': 'var(--ui-color-sound-main)',
        '--color-stop-2': '#EADFFF',
        '--color-stop-3': '#FAF8FF1A',
        '--gen-loading-bg-color': 'var(--ui-color-sound-main)',
        '--ready-color': 'var(--ui-color-sound-main)'
      }
    case 'backdrop':
      return {
        '--color-stop-1': 'var(--ui-color-stage-main)',
        '--color-stop-2': '#D6EDFF',
        '--color-stop-3': '#F3FCFD1A',
        '--gen-loading-bg-color': 'var(--ui-color-stage-main)',
        '--ready-color': 'var(--ui-color-stage-main)'
      }
    default:
      return {}
  }
})
</script>

<template>
  <UIBlockItem class="gen-item" :class="{ loading, ready }" :style="loadingStyle" :color="color" size="medium">
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

  &.ready {
    .placeholder {
      color: var(--ready-color);
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
