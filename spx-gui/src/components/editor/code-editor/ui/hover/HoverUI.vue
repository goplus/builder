<script setup lang="ts">
import type { HoverController } from '.'
import HoverCard from './HoverCard.vue'

defineProps<{
  controller: HoverController
}>()
</script>

<template>
  <Teleport :to="controller.widgetEl">
    <HoverCard v-if="controller.currentHoverRef.value != null" :hover="controller.currentHoverRef.value" />
  </Teleport>
</template>

<style lang="scss" scoped></style>
