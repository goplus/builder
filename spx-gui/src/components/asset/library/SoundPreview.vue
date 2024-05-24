<template>
  <div class="sound-preview">
    <SoundPlayer class="player" :src="audioSrc" color="primary" />
  </div>
</template>

<script setup lang="ts">
import type { Sound } from '@/models/sound'
import { useFileUrl } from '@/utils/file'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'

const props = defineProps<{
  sound: Sound
}>()

const [audioSrc] = useFileUrl(() => props.sound.file)
</script>

<style scoped lang="scss">
.sound-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.player {
  width: 36px;
  height: 36px;
}
</style>
