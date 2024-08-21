<script setup lang="ts">
import type { HoverPreview } from './hover-preview'

defineProps<{
  hoverPreview: HoverPreview
}>()
</script>
<template>
  <slot></slot>
</template>
