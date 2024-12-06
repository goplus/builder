<script setup lang="ts">
import type { CompletionController } from '.'
import CompletionCard from './CompletionCard.vue'

defineProps<{
  controller: CompletionController
}>()
</script>

<template>
  <Teleport :to="controller.widgetEl">
    <CompletionCard
      v-if="controller.nonEmptyItems != null"
      :items="controller.nonEmptyItems"
      :controller="controller"
    />
  </Teleport>
</template>

<style lang="scss" scoped></style>
