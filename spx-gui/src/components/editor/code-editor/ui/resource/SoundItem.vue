<template>
  <UIEditorSoundItem :name="item.name" :selected="selected" color="primary">
    <template #player>
      <SoundPlayer :src="audioSrc" color="primary" />
    </template>
  </UIEditorSoundItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import { Sound } from '@/models/sound'
import { UIEditorSoundItem } from '@/components/ui'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'

const props = defineProps<{
  item: Sound
  selected?: boolean
}>()

const [audioSrc] = useFileUrl(() => props.item.file)
</script>
