<!-- Sound / video play control (only UI) -->

<template>
  <div class="play-control" :class="[`play-control--${props.size}`]" :style="colorCssVars">
    <div v-show="!playing" class="play-control-play" @click.stop="handlePlay.fn">
      <UIIcon type="play" class="play-control-icon" />
    </div>
    <div v-show="playing" class="play-control-stop" @click.stop="emit('stop')">
      <svg viewBox="0 0 36 36" class="progress" :style="playCssVars">
        <circle class="bg"></circle>
        <circle class="fg"></circle>
      </svg>
      <UIIcon type="stop" class="play-control-icon" />
    </div>
    <!-- TODO: style optimization for play control -->
    <UILoading :visible="loading" cover class="play-control-loading" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIIcon, UILoading, useUIVariables } from '@/components/ui'
import type { Color } from '@/components/ui/tokens/colors'

export type Size = 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    playing: boolean
    /** Progress percentage, number in range `[0, 1]` */
    progress: number
    /**
     * Optional interval for rendering progress, in seconds.
     * Defaults to `0.3` seconds for smooth animation when progress jumps.
     * Set to `0` to disable transition, which is useful when progress is updated continuously.
     * TODO: consider removing this prop (& transition) and ensure smooth progress update in parent component.
     */
    progressInterval?: number
    color: Color
    playHandler: () => Promise<void>
    loading?: boolean
    size?: Size
  }>(),
  {
    size: 'medium',
    progressInterval: 0.3
  }
)

const emit = defineEmits<{
  stop: []
}>()

const handlePlay = useMessageHandle(() => props.playHandler(), {
  en: 'Failed to play',
  zh: '播放失败'
})

const playCssVars = computed(() => ({
  '--progress': props.progress ?? 0,
  '--progress-interval': `${props.progressInterval}s`
}))

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

<style scoped>
.play-control {
  position: relative;
}

.play-control--medium {
  width: 36px;
  height: 36px;
}

.play-control--large {
  width: 48px;
  height: 48px;
}

.play-control-play,
.play-control-stop {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
  --color: var(--color-main);
}

.play-control-play:hover,
.play-control-stop:hover {
  transform: scale(1.15);
  --color: var(--color-400);
}

.play-control-play:active,
.play-control-stop:active {
  transform: scale(1.15);
  --color: var(--color-600);
}

.play-control-play {
  color: var(--ui-color-grey-100);
  background-color: var(--color);
}

.play-control-stop {
  color: var(--color);
}

.play-control-icon {
  width: 16px;
  height: 16px;
}

.play-control--large .play-control-icon {
  width: 20px;
  height: 20px;
}

.progress {
  position: absolute;
  width: 100%;
  height: 100%;
  --size: 36px;
  --half-size: calc(var(--size) / 2);
  --stroke-width: 2px;
  --radius: calc((var(--size) - var(--stroke-width)) / 2);
  --circumference: calc(var(--radius) * pi * 2);
  --dash: calc((var(--progress) * var(--circumference)));
}

.progress circle {
  cx: var(--half-size);
  cy: var(--half-size);
  r: var(--radius);
  stroke-width: var(--stroke-width);
  fill: none;
  stroke-linecap: round;
}

.progress circle.bg {
  stroke: var(--color-300);
}

.progress circle.fg {
  transform: rotate(-90deg);
  transform-origin: var(--half-size) var(--half-size);
  stroke-dasharray: var(--dash) calc(var(--circumference) - var(--dash));
  transition: stroke-dasharray var(--progress-interval) linear 0s;
  stroke: var(--color);
}

.play-control-loading {
  border-radius: 50%;
}
</style>
