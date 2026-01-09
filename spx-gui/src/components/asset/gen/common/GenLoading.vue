<!-- Special loading placeholder for AIGC-Gen -->

<script setup lang="ts">
import { useSlots, type CSSProperties } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import animationFileUrl from './gen-loading.lottie?url'

const props = withDefaults(
  defineProps<{
    cover?: boolean
    visible?: boolean
    animationStyle?: CSSProperties | string
  }>(),
  {
    cover: false,
    visible: true,
    animationStyle: ''
  }
)

const slots = useSlots()
</script>

<template>
  <div class="gen-loading" :class="{ cover: props.cover, visible: props.visible }">
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
    background: radial-gradient(circle at 30% 20%, var(--ui-color-grey-200), var(--ui-color-grey-100) 60%);
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
