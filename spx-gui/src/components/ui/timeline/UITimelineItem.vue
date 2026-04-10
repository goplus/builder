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
    <p class="text-12 text-hint-2">{{ time }}</p>
    <p class="text-body">
      <slot></slot>
    </p>
  </NTimelineItem>
</template>

<style scoped>
:global(.n-timeline-item-timeline) {
  top: 5px !important;
  margin-left: 4px !important;
}
:global(.n-timeline-item-timeline__line) {
  /* set width 2px then scale it down to 1px, to make it offset for 0.5px, to keep it centered with the circle */
  width: 2px !important;
  transform: scaleX(0.5);
  left: 3px !important;
}
:global(.n-timeline-item-content) {
  margin-left: 31px !important;
}
:global(.n-timeline-item-content__meta) {
  margin-bottom: 12px !important;
}
</style>
