<template>
  <UISoundItem :selectable="{ selected }" :duration="formattedDuration" :name="asset.name">
    <template #player>
      <BlobSoundPlayer :blob="asset.blob" color="primary" />
    </template>
    <UICornerIcon v-show="selected" type="check" />
  </UISoundItem>
</template>
<script setup lang="ts">
import type { ExportedScratchSound } from '@/utils/scratch'
import { useAudioDuration } from '@/utils/audio'
import { UISoundItem, UICornerIcon } from '@/components/ui'
import BlobSoundPlayer from '../BlobSoundPlayer.vue'

const props = defineProps<{
  asset: ExportedScratchSound
  selected: boolean
}>()

const { formattedDuration } = useAudioDuration(() => props.asset.blob)
</script>
