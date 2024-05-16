<template>
  <PanelItem class="sound-item" :active="active" :name="props.sound.name" @remove="emit('remove')">
    <div class="content">
      <SoundPlayer :src="audioSrc" color="sound" />
    </div>
  </PanelItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import { Sound } from '@/models/sound'
import SoundPlayer from '../../sound/SoundPlayer.vue'
import PanelItem from '../common/PanelItem.vue'

const props = defineProps<{
  sound: Sound
  active: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()

const [audioSrc] = useFileUrl(() => props.sound.file)
</script>

<style lang="scss" scoped>
.sound-item {
  // different rule for sprite & sound item background
  background-color: var(--ui-color-sound-100);
  border-color: var(--ui-color-sound-100);

  &:not(.active):hover {
    background-color: var(--ui-color-sound-200);
    border-color: var(--ui-color-sound-200);
  }
}

.content {
  margin-top: 4px;
  width: 56px;
  height: 56px;
  padding: 10px;
}
</style>
