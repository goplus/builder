<script setup lang="ts">
defineSlots<{
  default: () => unknown
}>()
</script>

<template>
  <header class="editor-navbar">
    <slot></slot>
  </header>
</template>
