<script setup lang="ts">
defineSlots<{
  default: () => unknown
}>()
</script>

<template>
  <section class="map-editor-main">
    <slot></slot>
  </section>
</template>
