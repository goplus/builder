<template>
  <div class="skeleton-container">
    <SkeletonAnimationRenderer
      :data="props.data"
      :texture="props.texture"
      :fps="30"
      :autoplay="true"
      :scale="props.scale"
      :style="{ width: '100%', height: '100%', position: 'relative' }"
      @ready="(renderer) => handleReady(renderer)"
    />
    <div v-if="rendererReady && renderer" class="playback-controller">
      <div class="anim-play" :style="colorCssVars">
        <div v-show="!renderer.playing" class="play" @click.stop="handlePlay(true)">
          <UIIcon class="icon" type="play" />
        </div>
        <div v-show="renderer.playing" class="stop" @click.stop="handlePlay(false)">
          <UIIcon class="icon" type="stop" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { AnimationExportData } from '@/utils/ispxLoader'
import { computed, ref, shallowReactive, type ShallowReactive } from 'vue'
import type { Renderer } from './SkeletonAnimationRenderer.vue'
import SkeletonAnimationRenderer from './SkeletonAnimationRenderer.vue'
import { UIIcon, useUIVariables, type Color } from '@/components/ui'
import { debounce } from '@/utils/utils'
const props = withDefaults(
  defineProps<{
    data: AnimationExportData
    texture: string
    fps?: number
    autoplay?: boolean
    color?: Color
    scale?: [number, number]
  }>(),
  {
    fps: 30,
    autoplay: true,
    color: 'sprite',
    scale: () => [40, 40]
  }
)

const emit = defineEmits<{
  ready: [Renderer],
  // pause and resume carousel autoplay
  pauseAutoplay: [],
  resumeAutoplay: []
}>()

let renderer: ShallowReactive<Renderer> | null = null
const rendererReady = ref(false)

const handleReady = async (r: Renderer) => {
  renderer = shallowReactive(r)
  rendererReady.value = true
  emit('ready', r)
}

const handlePlay = (play: boolean) => {
  if (!renderer) {
    return
  }
  if (play) {
    renderer.start()
    resumeCarouselAutoplay()
  } else {
    renderer.stop()
    emit('pauseAutoplay')
  }
}

const resumeCarouselAutoplay = debounce(() => {
  emit('resumeAutoplay')
}, 5000)

const uiVariables = useUIVariables()
const colorCssVars = computed(() => {
  const color = uiVariables.color[props.color]
  return {
    '--color-main': color.main,
    '--color-100': color[100],
    '--color-300': color[300],
    '--color-400': color[400],
    '--color-600': color[600]
  }
})
</script>
<style lang="scss" scoped>
.skeleton-container:hover .playback-controller {
  opacity: 1;
  pointer-events: auto;
}

.playback-controller {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;

  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 16px;
  z-index: 100;
  width: 100%;
}

.play,
.stop {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;
  cursor: pointer;

  transition: transform 0.2s;
  --color: var(--color-main);

  &:hover {
    transform: scale(1.167);
    --color: var(--color-400);
  }
  &:active {
    transform: scale(1.167);
    --color: var(--color-600);
  }
}

.play {
  color: var(--ui-color-grey-100);
  background-color: var(--color);

  .icon {
    width: 44.444%;
    height: 44.444%;
  }
}

.stop {
  position: relative;
  color: var(--color);
  border: 2px solid var(--color);

  .icon {
    width: 50%;
    height: 50%;
  }
}
</style>
