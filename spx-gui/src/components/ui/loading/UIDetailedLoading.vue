<script setup lang="ts">
import { computed, ref, watch, nextTick, useAttrs } from 'vue'
import { DotLottieVue, type DotLottieVueInstance } from '@lottiefiles/dotlottie-vue'
import { cn, type ClassValue } from '../utils'
import animationFileUrl from './animation.lottie?url'

defineOptions({
  inheritAttrs: false
})

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

const attrs = useAttrs()
const rootClass = computed(() =>
  cn(
    'h-4/5 w-full flex flex-col items-center justify-center [transition:visibility_0.3s,opacity_0.3s]',
    props.cover ? 'absolute left-0 top-0 h-full' : null,
    props.cover && mask.value === 'semi-transparent'
      ? 'bg-[#24292f99] [backdrop-filter:blur(5px)] [-webkit-backdrop-filter:blur(5px)]'
      : null,
    props.visible ? 'visible opacity-100' : 'invisible opacity-0',
    attrs.class as ClassValue
  )
)
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
const textClass = computed(() =>
  cn(
    'flex items-center gap-2 text-13/5 text-title',
    props.cover && mask.value === 'semi-transparent' ? 'text-grey-100' : null
  )
)

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
  <div v-bind="rootAttrs" :class="rootClass">
    <DotLottieVue ref="dotLottieRef" class="h-[150px] w-[90px] flex-none" autoplay loop :src="animationFileUrl" />
    <div class="mb-1 h-[5px] w-45 rounded-full bg-grey-600">
      <div
        v-show="percentage > 0"
        class="h-full rounded-full bg-primary-main"
        :style="{ width: `${percentage * 100}%` }"
      ></div>
    </div>
    <div :class="textClass">
      <slot></slot>
      <span>{{ Math.floor(percentage * 100) }}%</span>
    </div>
  </div>
</template>
