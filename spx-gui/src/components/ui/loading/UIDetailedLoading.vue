<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { DotLottieVue, type DotLottieVueInstance } from '@lottiefiles/dotlottie-vue'
import animationFileUrl from './animation.lottie?url'

export type MaskType = 'none' | 'semi-transparent'

const props = withDefaults(
  defineProps<{
    percentage: number
    cover?: boolean
    visible?: boolean
    mask?: boolean | MaskType
  }>(),
  {
    cover: false,
    visible: true,
    mask: true
  }
)

const mask = computed(() => {
  if (props.mask === false) return 'none'
  if (props.mask === true) return 'semi-transparent'
  return props.mask
})

const dotLottieRef = ref<DotLottieVueInstance>()

watch(
  // Correct the animation size when visible
  () => [props.visible, dotLottieRef.value] as const,
  async ([visible, dotLottie]) => {
    if (!visible || dotLottie == null) return
    const instance = dotLottie.getDotLottieInstance()
    if (instance == null) return
    await nextTick()
    instance.resize()
  }
)
</script>

<template>
  <div class="ui-detailed-loading" :class="{ cover, visible, [`mask-${mask}`]: true }">
    <DotLottieVue ref="dotLottieRef" class="animation" autoplay loop :src="animationFileUrl" />
    <div class="progress-bar">
      <div v-show="percentage > 0" class="progress" :style="{ width: `${percentage * 100}%` }"></div>
    </div>
    <div class="text">
      <slot></slot>
      <span>{{ Math.floor(percentage * 100) }}%</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ui-detailed-loading {
  width: 100%;
  height: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  visibility: hidden;
  opacity: 0;
  transition:
    visibility 0.3s,
    opacity 0.3s;

  &.cover {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;

    &.mask-semi-transparent {
      background-color: rgba(36, 41, 47, 0.6);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);

      .text {
        color: var(--ui-color-grey-100);
      }
    }
  }

  &.visible {
    visibility: visible;
    opacity: 1;
  }
}

.animation {
  flex: 0 0 auto;
  width: 90px;
  height: 150px;
}

.progress-bar {
  margin-bottom: 4px;
  width: 180px;
  height: 5px;
  border-radius: 2.5px;
  background-color: var(--ui-color-grey-600);

  .progress {
    height: 100%;
    background-color: var(--ui-color-primary-main);
    border-radius: 2.5px;
    transition: width 0.3s ease;
  }
}

.text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 20px;
  color: var(--ui-color-title);
}
</style>
