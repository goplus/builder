<template>
  <UIBlockItem color="primary" size="large">
    <div class="sound-container">
      <SoundPlayer class="sound-player" :src="audioSrc" color="sound" />
    </div>
    <UIBlockItemTitle size="large">
      {{ name }}
    </UIBlockItemTitle>
    <UICornerIcon v-show="selected" type="check" />
  </UIBlockItem>
</template>
<script setup lang="ts">
import SoundPlayer from '../editor/sound/SoundPlayer.vue'
import UIBlockItem from './UIBlockItem.vue'
import UICornerIcon from './UICornerIcon.vue'
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
  height: 48px;
  width: 48px;
}
</style>
