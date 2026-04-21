<template>
  <div class="flex items-center justify-center">
    <SoundPlayer :src="audioSrc" />
  </div>
</template>

<script setup lang="ts">
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import { asset2Sound } from '@/models/spx/common/asset'
import type { AssetData } from '@/apis/asset'
import { Sound } from '@/models/spx/sound'
import SoundPlayer from '@/components/editor/stage/sound/SoundPlayer.vue'

const props = defineProps<{
  sound: Sound | AssetData
}>()

const sound = useAsyncComputedLegacy(async () => {
  if (props.sound instanceof Sound) return props.sound
  return asset2Sound(props.sound)
})
const [audioSrc] = useFileUrl(() => sound.value?.file)
</script>
