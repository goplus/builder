<template>
  <option :value="value">
    <slot></slot>
  </option>
</template>

<script setup lang="ts">
defineProps<{
  value: string
}>()
</script>
