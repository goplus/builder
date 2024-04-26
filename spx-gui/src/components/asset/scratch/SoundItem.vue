<template>
  <ScratchItemContainer :selected="selected">
    <div class="sound-display">
      <div class="sound-container">
        <BlobSoundPlayer :blob="asset.blob" :color="uiVariables.color.primary" />
      </div>
    </div>
    <div class="asset-name">{{ asset.name }}</div>
    <div class="duration">{{ formattedDuration }}</div>
  </ScratchItemContainer>
</template>
<script setup lang="ts">
import type { ExportedScratchFile } from '@/utils/scratch'
import BlobSoundPlayer from '../BlobSoundPlayer.vue'
import ScratchItemContainer from './ScratchItemContainer.vue'
import { useUIVariables } from '@/components/ui'
import { useAudioDuration } from '@/utils/audio'

const props = defineProps<{
  asset: ExportedScratchFile
  selected: boolean
}>()

const uiVariables = useUIVariables()

const { formattedDuration } = useAudioDuration(() => props.asset.blob)
</script>
<style lang="scss" scoped>
.duration {
  color: var(--ui-color-hint-1);
  font-size: 10px;
  line-height: 18px;
}

.sound-container {
  height: 48px;
  width: 48px;
}

.asset-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}

.sound-display {
  flex: 1;
  display: flex;
  align-items: center;
}
</style>
