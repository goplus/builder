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

<style scoped>
@property --bg-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

.gen-loading {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  visibility: hidden;
  opacity: 0;
  transition:
    visibility 0.2s,
    opacity 0.2s;
  border-radius: 8px;
  overflow: hidden;
  isolation: isolate;
}

.gen-loading.variant-default {
  background-image: radial-gradient(circle at -8% 0%, rgb(116 231 239 / 0.18) 0%, transparent 62%),
    radial-gradient(circle at 106% -2%, rgb(138 195 255 / 0.12) 0%, transparent 64%),
    radial-gradient(circle at 108% 106%, rgb(249 250 252 / 0.58) 0%, transparent 72%),
    radial-gradient(circle at -2% 110%, rgb(244 247 250 / 0.48) 0%, transparent 68%),
    linear-gradient(135deg, #f7fcfd 0%, #fff 54%, #f8f9fa 100%);
}

.gen-loading.cover {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  background-color: var(--ui-color-grey-100);
}

.gen-loading.variant-bg-spin {
  /* CSS Progressive Enhancement: Browsers that do not support @property will skip its definition.
     We can ensure compatibility by setting an initial value here. */
  --bg-angle: 0deg;

  /* Use cos/sin to calculate the rotation position of each gradient center.
     100% is the rotation radius, 50% is the center offset. */
  background-image: radial-gradient(
      circle at calc(50% + cos(var(--bg-angle) + 0deg) * 100%) calc(50% + sin(var(--bg-angle) + 0deg) * 100%),
      var(--ui-color-turquoise-200) 20%,
      transparent 70%
    ),
    radial-gradient(
      circle at calc(50% + cos(var(--bg-angle) + 90deg) * 100%) calc(50% + sin(var(--bg-angle) + 90deg) * 100%),
      var(--ui-color-blue-200) 20%,
      transparent 70%
    ),
    radial-gradient(
      circle at calc(50% + cos(var(--bg-angle) + 180deg) * 100%) calc(50% + sin(var(--bg-angle) + 180deg) * 100%),
      var(--ui-color-blue-100) 20%,
      transparent 70%
    ),
    radial-gradient(
      circle at calc(50% + cos(var(--bg-angle) + 270deg) * 100%) calc(50% + sin(var(--bg-angle) + 270deg) * 100%),
      var(--ui-color-grey-100) 20%,
      transparent 70%
    );

  animation: spin-gradient 4s linear infinite;
}

@keyframes spin-gradient {
  to {
    --bg-angle: 360deg;
  }
}

.gen-loading.visible {
  visibility: visible;
  opacity: 1;
}

.gen-loading.visible.cover {
  opacity: 0.97;
}

.content {
  position: relative;
  z-index: 1;
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
