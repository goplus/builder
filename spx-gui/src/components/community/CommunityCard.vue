<!-- TODO: merge with UICard? -->

<template>
  <UICard class="community-card">
    <slot></slot>
  </UICard>
</template>

<script setup lang="ts">
import { UICard } from '@/components/ui'
</script>

<style lang="scss" scoped>
.community-card {
  box-shadow: 0px 2px 4px 0px rgba(36, 41, 47, 0.05);
}
</style>
