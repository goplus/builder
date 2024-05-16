<template>
  <AssetItem class="sound-item" :selected="selected">
    <div class="player">
      <SoundPlayer :src="audioSrc" color="primary" />
    </div>
    <AssetItemName>{{ asset.displayName }}</AssetItemName>
    <p class="duration">{{ formattedDuration }}</p>
  </AssetItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'
import AssetItem from './AssetItem.vue'
import AssetItemName from './AssetItemName.vue'
import { asset2Sound } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import { useAudioDuration } from '@/utils/audio'

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
.player {
  margin: 22px 0;
  width: 48px;
  height: 48px;
}

.duration {
  color: var(--ui-color-hint-1);
  text-align: center;
  font-size: 10px;
  line-height: 1.8;
}
</style>
