<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useAudioDuration } from '@/utils/audio'
import type { AssetData } from '@/apis/asset'
import { asset2Sound } from '@/models/common/asset'
import { UISoundItem } from '@/components/ui'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const sound = useAsyncComputedLegacy(() => asset2Sound(props.asset))
const [audioSrc] = useFileUrl(() => sound.value?.file)
const name = computed(() => props.asset.displayName)
const { formattedDuration } = useAudioDuration(() => {
  return audioSrc.value
})
</script>

<template>
  <UISoundItem :audio-src="audioSrc" :name="name" :duration="formattedDuration" :selectable="{ selected }">
    <template #player>
      <SoundPlayer color="primary" :src="audioSrc" />
    </template>
    <slot></slot>
  </UISoundItem>
</template>
