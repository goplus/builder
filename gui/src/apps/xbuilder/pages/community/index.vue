<template>
  <div class="bg-grey-300 h-full w-full flex flex-col overflow-y-auto">
    <CommunityNavbar />
    <router-view />
    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
</script>
