<script setup lang="ts">
defineSlots<{
  default: () => unknown
}>()
</script>

<template>
  <section class="asset-card">
    <slot></slot>
  </section>
</template>
