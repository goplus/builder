<template>
  <PanelSummaryItem :name="props.sound.name">
    <svg class="play-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
      <path d="M15.46 10.9389L10.9821 8.19895C10.0911 7.65395 8.94495 8.29291 8.94495 9.33591V14.664C8.94495 15.707 10.0911 16.346 10.9821 15.801L15.46 13.061C16.254 12.575 16.254 11.4249 15.46 10.9389Z" fill="white" />
    </svg>
  </PanelSummaryItem>
</template>

<script setup lang="ts">
import { Sound } from '@/models/sound'
import PanelSummaryItem from '../common/PanelSummaryItem.vue'

const props = defineProps<{
  sound: Sound
}>()
</script>

<style lang="scss" scoped>
.play-icon {
  margin: 6px 0;
  width: 24px;
  height: 24px;
  color: var(--ui-color-sound-main);
}
</style>
