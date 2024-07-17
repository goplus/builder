<template>
  <UISoundItem :selected="selected" :duration="formattedDuration" :name="asset.name">
    <BlobSoundPlayer :blob="asset.blob" color="primary" />
  </UISoundItem>
</template>
<script setup lang="ts">
import type { ExportedScratchFile } from '@/utils/scratch'
import { useAudioDuration } from '@/utils/audio'
import { UISoundItem } from '@/components/ui'
import BlobSoundPlayer from '../BlobSoundPlayer.vue'

const props = defineProps<{
  asset: ExportedScratchFile
  selected: boolean
}>()

const { formattedDuration } = useAudioDuration(() => props.asset.blob)
</script>
<style lang="scss" scoped>
.sound-container {
  height: 48px;
  width: 48px;
}
</style>
