<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import monitorImage from '@ui-images/monitor-colorful.png'
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import UIButton from '@/components/ui/UIButton.vue'

const router = useRouter()

onMounted(() => {
  document.title = 'Page not found - XBuilder'
})
</script>

<template>
  <div class="flex min-h-screen min-w-360 flex-col bg-grey-200">
    <CommunityNavbar />
    <main class="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <img class="h-47.5 w-67.5 object-contain" :src="monitorImage" alt="" />
      <h1 class="m-0 text-2xl font-medium text-grey-1000">Page not found</h1>
      <UIButton class="mt-4 h-9 text-lg" type="primary" @click="router.push('/')">
        Return to home page
      </UIButton>
    </main>
    <CommunityFooter />
  </div>
</template>
