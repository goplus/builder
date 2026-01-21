<!-- Special loading placeholder for AIGC-Gen -->

<script setup lang="ts">
import { useSlots, type CSSProperties } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import animationFileUrl from './gen-loading.lottie?url'

type Variant =
  | 'default'
  /**
   * Animated background rotation during loading
   */
  | 'bg-spin'

withDefaults(
  defineProps<{
    variant?: Variant
    cover?: boolean
    visible?: boolean
    animationStyle?: CSSProperties | string
  }>(),
  {
    variant: 'default',
    cover: false,
    visible: true,
    animationStyle: ''
  }
)

const slots = useSlots()
</script>

<template>
  <div class="gen-loading" :class="[{ cover, visible }, `variant-${variant}`]">
    <div class="content">
      <DotLottieVue class="animation" :style="animationStyle" autoplay loop :src="animationFileUrl" />
      <div v-if="!!slots.default" class="text">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gen-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  visibility: hidden;
  opacity: 0;
  transition:
    visibility 0.2s,
    opacity 0.2s;

  &.cover {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    overflow: hidden;
  }

  &.variant-bg-spin {
    &::before {
      content: '';
      position: absolute;
      width: 150%;
      height: 150%;
      top: -25%;
      left: -25%;
      backdrop-filter: blur(50px);
      will-change: transform;
      background-image: radial-gradient(circle at 50% -20%, var(--ui-color-turquoise-200) 20%, transparent 70%),
        radial-gradient(circle at 50% 120%, var(--ui-color-blue-200) 20%, transparent 70%),
        radial-gradient(circle at -20% 50%, var(--ui-color-blue-100) 20%, transparent 70%),
        radial-gradient(circle at 120% 50%, var(--ui-color-grey-100) 20%, transparent 70%);

      animation: rotate-gradient 2.5s linear infinite;
      @keyframes rotate-gradient {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    }

    .content {
      z-index: 1;
    }
  }

  &.visible {
    visibility: visible;
    opacity: 1;
  }
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.animation {
  width: 80px;
  height: 80px;
}

.text {
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
  color: var(--ui-color-text);
  text-align: center;
}
</style>
