<template>
  <PanelSummaryItem>
    <UIIcon class="icon" type="sound" />
  </PanelSummaryItem>
</template>

<script setup lang="ts">
import { Sound } from '@/models/sound'
import { UIIcon } from '@/components/ui'
import PanelSummaryItem from '../common/PanelSummaryItem.vue'

defineProps<{
  sound: Sound
}>()
</script>

<style lang="scss" scoped>
.icon {
  margin: 6px 0;
  width: 24px;
  height: 24px;

  color: var(--ui-color-sound-main);
}
</style>
