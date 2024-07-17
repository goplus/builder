<template>
  <UIBlockItem color="sound" variant="colorful" :active="selected">
    <div class="sound-container">
      <!-- Use DumbSoundPlayer or SoundPlayer? -->
      <SoundPlayer class="sound-player" :src="audioSrc" color="sound" />
    </div>
    <UIBlockItemTitle size="medium">
      {{ name }}
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import SoundPlayer from '../editor/sound/SoundPlayer.vue'
import UIBlockItem from './UIBlockItem.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

defineProps<{
  audioSrc: string | null
  name: string
  selected: boolean
}>()
</script>
<style scoped lang="scss">
.sound-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sound-player {
  height: 36px;
  width: 36px;
}
</style>
