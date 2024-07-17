<template>
  <UISoundItem :selected="selected" :duration="formattedDuration" :name="asset.displayName">
    <SoundPlayer :src="audioSrc" color="primary" />
  </UISoundItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'
import { asset2Sound } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import { useAudioDuration } from '@/utils/audio'
import { UISoundItem } from '@/components/ui'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const sound = useAsyncComputed(() => asset2Sound(props.asset))
const [audioSrc] = useFileUrl(() => sound.value?.file)
const { formattedDuration } = useAudioDuration(() => {
  return audioSrc.value
})
</script>

<style lang="scss" scoped>
.player-container {
  width: 48px;
  height: 92px;
  display: flex;
  align-items: center;
}

.player {
  width: 48px;
  height: 48px;
}
</style>
