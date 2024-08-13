<template>
  <div class="container" @mouseenter="() => setPlay(true)" @mouseleave="() => setPlay(false)">
    <Transition name="fade" mode="out-in" appear>
      <UIImg
        v-if="!play || animations.length === 0"
        class="sprite-preview"
        :src="imgSrc"
        :loading="imgLoading"
      />
      <div v-else class="sprite-preview">
        <AnimationPlayer
          :costumes="animations[currentIndex].costumes"
          :duration="animations[currentIndex].duration"
          :sound="null"
          :style="{ width: '100%', height: '100%' }"
        />
        <div class="animation-play-info">{{ currentIndex + 1 }}/{{ animations.length }}</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import AnimationPlayer from '@/components/editor/sprite/animation/AnimationPlayer.vue'
import { UIImg } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import { useFileUrl } from '@/utils/file'
import { computed, ref } from 'vue'

const props = defineProps<{
  sprite: Sprite
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.sprite.defaultCostume?.img)

const animations = computed(() => props.sprite.animations)
const currentIndex = ref(0)
const play = ref(false)

const INTERVAL = 5000
let timer: number

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % animations.value.length
}

const setPlay = (value: boolean) => {
  play.value = value
  clearInterval(timer)
  if (value) {
    timer = setInterval(next, INTERVAL) as any
  }
}
</script>

<style lang="scss" scoped>
.sprite-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.animation-play-info {
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  padding: 2px 4px;
  font-size: 10px;
  border-radius: 2px;
}

.fade-enter-active {
  transition: all 0.25s ease;
}
.fade-leave-active {
  display: none;
}

.fade-enter-from {
  opacity: 0;
}
</style>
