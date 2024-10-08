<template>
  <CenteredWrapper>
    <h2>User {{ name }}</h2>
    <router-view />
  </CenteredWrapper>
</template>

<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'

defineProps<{
  name: string
}>()
</script>
