<script setup lang="ts">
defineProps<{
  items?: unknown[]
  height?: number
  emptyText?: string
}>()
</script>

<template>
  <div :style="{ minHeight: height != null ? `${height}px` : undefined }">
    <slot v-if="items == null || items.length > 0" :data="items" />
    <div v-else class="flex items-center justify-center rounded-md bg-grey-100 p-8 text-grey-700">
      <slot name="empty">{{ emptyText ?? 'No results' }}</slot>
    </div>
  </div>
</template>
