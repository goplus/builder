<template>
  <section class="header">
    <CenteredWrapper>Projects</CenteredWrapper>
  </section>
  <CenteredWrapper>Search Result</CenteredWrapper>
</template>

<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
</script>

<style lang="scss" scoped>
.header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ui-color-grey-100);
}
</style>
