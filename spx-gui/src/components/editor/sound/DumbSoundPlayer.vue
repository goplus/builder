<!-- Sound player (only UI) -->

<template>
  <div class="sound-play" :class="[`size-${props.size}`]" :style="colorCssVars">
    <div v-show="!playing" class="play" @click.stop="handlePlay.fn">
      <UIIcon class="icon" type="play" />
    </div>
    <div v-show="playing" class="stop" @click.stop="emit('stop')">
      <svg viewBox="0 0 36 36" class="progress" :style="playCssVars">
        <circle class="bg"></circle>
        <circle class="fg"></circle>
      </svg>
      <UIIcon class="icon" type="stop" />
    </div>
    <!-- TODO: style optimization for sound player -->
    <UILoading :visible="loading" cover class="loading" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIIcon, UILoading, useUIVariables } from '@/components/ui'
import type { Color } from '@/components/ui/tokens/colors'

export type SoundPlayerSize = 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    playing: boolean
    progress: number
    color: Color
    playHandler: () => Promise<void>
    loading?: boolean
    size?: SoundPlayerSize
  }>(),
  {
    size: 'medium'
  }
)

const emit = defineEmits<{
  stop: []
}>()

const handlePlay = useMessageHandle(() => props.playHandler(), {
  en: 'Failed to play audio',
  zh: '无法播放音频'
})

const playCssVars = computed(() => ({
  '--progress': props.progress ?? 0
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

<style lang="scss" scoped>
.sound-play {
  position: relative;

  &.size-medium {
    width: 36px;
    height: 36px;
    .play,
    .stop {
      &:hover,
      &:active {
        transform: scale(1.111);
      }
    }
  }

  &.size-large {
    width: 48px;
    height: 48px;
    .icon {
      width: 20px;
      height: 20px;
    }
    .play,
    .stop {
      &:hover,
      &:active {
        transform: scale(1.166);
      }
    }
  }
}

.play,
.stop {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;
  cursor: pointer;

  transition: transform 0.2s;
  --color: var(--color-main);
  &:hover {
    --color: var(--color-400);
  }
  &:active {
    --color: var(--color-600);
  }
}

.play {
  color: var(--ui-color-grey-100);
  background-color: var(--color);
}

.stop {
  position: relative;
  color: var(--color);
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
  --dash: calc((var(--progress) * var(--circumference)) / 100);

  circle {
    cx: var(--half-size);
    cy: var(--half-size);
    r: var(--radius);
    stroke-width: var(--stroke-width);
    fill: none;
    stroke-linecap: round;

    &.bg {
      stroke: var(--color-300);
    }

    &.fg {
      transform: rotate(-90deg);
      transform-origin: var(--half-size) var(--half-size);
      stroke-dasharray: var(--dash) calc(var(--circumference) - var(--dash));
      transition: stroke-dasharray 0.3s linear 0s;
      stroke: var(--color);
    }
  }
}

.loading {
  border-radius: 50%;
}
</style>
