<template>
  <div>Project {{ owner }}/{{ name }}</div>
</template>

<script setup lang="ts">
defineProps<{
  owner: string
  name: string
}>()
</script>
