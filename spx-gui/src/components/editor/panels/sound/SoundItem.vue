<template>
  <EditorItem
    color="sound"
    :active="active"
    :name="props.sound.name"
    :item="props.sound"
    removable
    @remove="emit('remove')"
  >
    <SoundPlayer class="sound-player" :src="audioSrc" color="sound" />
  </EditorItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import { Sound } from '@/models/sound'
import SoundPlayer from '../../sound/SoundPlayer.vue'
import EditorItem from '../../common/EditorItem.vue'

const props = defineProps<{
  sound: Sound
  active: boolean
}>()

const emit = defineEmits<{
  remove: []
  addToAssetLibrary: []
}>()

const [audioSrc] = useFileUrl(() => props.sound.file)
</script>

<style lang="scss" scoped>
.sound-player {
  width: 36px;
  height: 36px;
}
</style>
