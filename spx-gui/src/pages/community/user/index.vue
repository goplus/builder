<template>
  <h2>User {{ name }}</h2>
  <router-view />
</template>

<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>
