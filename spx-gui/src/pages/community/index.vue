<template>
  <div class="wrapper">
    <TopNav></TopNav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import TopNav from '@/components/community/TopNav.vue'
</script>

<style lang="scss" scoped>
.wrapper {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: var(--ui-color-grey-300);
}
</style>
