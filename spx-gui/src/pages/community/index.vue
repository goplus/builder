<template>
  <div class="wrapper">
    <CommunityNavbar />
    <router-view />
    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
</script>

<style lang="scss" scoped>
.wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: var(--ui-color-grey-300);
}
</style>
