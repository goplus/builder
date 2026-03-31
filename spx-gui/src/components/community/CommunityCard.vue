<!-- TODO: merge with UICard? -->

<template>
  <UICard class="community-card">
    <slot></slot>
  </UICard>
</template>

<script setup lang="ts">
import { UICard } from '@/components/ui'
</script>

<style scoped>
.community-card {
  /* TODO: review this shadow value before promoting it into a shared token. */
  box-shadow: 0px 2px 4px 0px rgba(36, 41, 47, 0.05);
}
</style>
