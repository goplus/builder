<template>
  <UIBlockItem :active="active">
    <div class="content">
      <SoundPlayer :src="audioSrc" color="primary" />
    </div>
    <p class="name">{{ sound.name }}</p>
  </UIBlockItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import { Sound } from '@/models/sound'
import { UIBlockItem } from '@/components/ui'
import SoundPlayer from '@/components/editor/sound/SoundPlayer.vue'

const props = defineProps<{
  sound: Sound
  active: boolean
}>()

const [audioSrc] = useFileUrl(() => props.sound.file)
</script>

<style lang="scss" scoped>
.content {
  margin-top: 4px;
  width: 56px;
  height: 56px;
  padding: 10px;
}

.name {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.6;
  padding: 3px 8px 3px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}
</style>
