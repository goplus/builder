<template>
  <UISoundItem :selected="selected" :duration="formattedDuration" :name="asset.displayName">
    <template #player>
      <SoundPlayer :src="audioSrc" color="primary" />
    </template>
  </UISoundItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { AssetData, AssetType } from '@/apis/asset'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import { useAudioDuration } from '@/utils/audio'
import { UISoundItem } from '@/components/ui'

const props = defineProps<{
  asset: AssetData<AssetType.Sound>
  selected: boolean
}>()

const sound = useAsyncComputed(() => cachedConvertAssetData(props.asset))
const [audioSrc] = useFileUrl(() => sound.value?.file)
const { formattedDuration } = useAudioDuration(() => {
  return audioSrc.value
})
</script>
