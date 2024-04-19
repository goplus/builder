<template>
  <PanelSummaryItem :name="props.sound.name">
    <UIIcon class="play-icon" type="playCircle" />
  </PanelSummaryItem>
</template>

<script setup lang="ts">
import { UIIcon } from '@/components/ui'
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
