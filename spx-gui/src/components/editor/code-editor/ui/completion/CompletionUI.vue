<script setup lang="ts">
import type { CompletionController } from '.'
import CompletionCard from './CompletionCard.vue'

defineProps<{
  controller: CompletionController
}>()
</script>

<template>
  <Teleport :to="controller.widgetEl">
    <CompletionCard v-if="controller.itemsRef.value != null" :items="controller.itemsRef.value" />
  </Teleport>
</template>

<style lang="scss" scoped></style>
