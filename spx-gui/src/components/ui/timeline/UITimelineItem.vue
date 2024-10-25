<script setup lang="ts">
import { NTimelineItem } from 'naive-ui'

defineProps<{
  time: string
}>()
</script>

<template>
  <NTimelineItem :style="{ '--n-icon-size': '8px' }">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="4" fill="#D9DFE5" />
      </svg>
    </template>
    <p class="time">{{ time }}</p>
    <p class="content">
      <slot></slot>
    </p>
  </NTimelineItem>
</template>

<style lang="scss" scoped>
.time {
  color: var(--ui-color-hint-2);

  font-size: 12px;
  line-height: 18px;
}
.content {
  font-size: 14px;
  line-height: 22px;
}
:global(.n-timeline-item-timeline) {
  top: 3px !important;
  margin-left: 4px !important;
}
:global(.n-timeline-item-timeline__line) {
  width: 1px !important;
}
:global(.n-timeline-item-content) {
  margin-left: 31px !important;
}
:global(.n-timeline-item-content__meta) {
  margin-bottom: 12px !important;
}
</style>
