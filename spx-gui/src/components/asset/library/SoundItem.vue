<template>
  <UISoundItem :selected="selected" :duration="formattedDuration" :name="asset.displayName">
    <template #player>
      <SoundPlayer :src="audioSrc" color="primary" />
    </template>
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
