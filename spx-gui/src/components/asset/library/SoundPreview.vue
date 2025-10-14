<template>
  <div class="sound-preview">
    <SoundPlayer class="player" :src="audioSrc" color="primary" />
  </div>
</template>

<script setup lang="ts">
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import { asset2Sound } from '@/models/common/asset'
import type { AssetData } from '@/apis/asset'
import { Sound } from '@/models/sound'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'

const props = defineProps<{
  sound: Sound | AssetData
}>()

const sound = useAsyncComputedLegacy(async () => {
  if (props.sound instanceof Sound) return props.sound
  return asset2Sound(props.sound)
})
const [audioSrc] = useFileUrl(() => sound.value?.file)
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
