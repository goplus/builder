<script setup lang="ts">
import { RouterView } from 'vue-router'

import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
</script>

<template>
  <div class="flex min-h-screen min-w-360 flex-col bg-grey-300 font-main text-text">
    <CommunityNavbar />
    <RouterView class="flex-1" />
    <CommunityFooter />
  </div>
</template>
