<!-- Sound player (only UI) -->

<template>
  <div class="sound-play">
    <div v-show="!playing" class="play" @click.stop="emit('play')">
      <UIIcon class="icon" type="play" />
    </div>
    <div v-show="playing" class="stop" @click.stop="emit('stop')">
      <svg viewBox="0 0 36 36" class="progress" :style="playCssVars">
        <circle class="bg"></circle>
        <circle class="fg"></circle>
      </svg>
      <UIIcon class="icon" type="stop" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIIcon } from '@/components/ui'

const props = defineProps<{
  playing: boolean
  progress: number
}>()

const emit = defineEmits<{
  play: []
  stop: []
}>()

const playCssVars = computed(() => ({
  '--progress': props.progress ?? 0
}))
</script>

<style lang="scss" scoped>
.sound-play {
  width: 100%;
  height: 100%;
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
  --color: var(--ui-color-sound-main);
  &:hover {
    transform: scale(1.167);
    --color: var(--ui-color-sound-400);
  }
  &:active {
    transform: scale(1.167);
    --color: var(--ui-color-sound-600);
  }
}

.play {
  color: var(--ui-color-grey-100);
  background-color: var(--color);

  .icon {
    width: 16px;
    height: 16px;
  }
}

.stop {
  position: relative;
  color: var(--color);
  .icon {
    width: 18px;
    height: 18px;
  }
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
      stroke: var(--ui-color-sound-300);
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
</style>
