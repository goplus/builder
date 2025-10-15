<template>
  <UISoundItem :selectable="{ selected }" :duration="formattedDuration" :name="asset.displayName">
    <template #player>
      <SoundPlayer :src="audioSrc" color="primary" />
    </template>
    <UICornerIcon v-show="selected" type="check" />
  </UISoundItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'
import { asset2Sound } from '@/models/common/asset'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useAudioDuration } from '@/utils/audio'
import { UISoundItem, UICornerIcon } from '@/components/ui'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const sound = useAsyncComputedLegacy(() => asset2Sound(props.asset))
const [audioSrc] = useFileUrl(() => sound.value?.file)
const { formattedDuration } = useAudioDuration(() => {
  return audioSrc.value
})
</script>
