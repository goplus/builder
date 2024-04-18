<!-- Summary List for Sprite/Sound Panel -->

<template>
  <ul class="panel-summary-list">
    <slot></slot>
    <PanelSummaryMore v-if="hasMore" />
  </ul>
</template>

<script setup lang="ts">
import PanelSummaryMore from './PanelSummaryMore.vue'
defineProps<{
  hasMore: boolean
}>()
</script>

<style scoped lang="scss">
.panel-summary-list {
  padding: 12px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
