<script setup lang="ts">
import { useRouter } from 'vue-router'

import { UIButton, UIImg } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import errorImg from './error.png'

const router = useRouter()
</script>

<template>
  <div
    v-radar="{ name: '404 page', desc: 'Displayed when a page is not found' }"
    class="bg-grey-200 h-full flex flex-col"
  >
    <CommunityNavbar />
    <div class="w-full flex-1 flex flex-col items-center justify-center gap-4">
      <UIImg :src="errorImg" class="h-47.5 w-67.5" />
      <p class="text-2xl text-grey-1000">
        {{ $t({ en: 'Page not found', zh: '页面未找到' }) }}
      </p>
      <UIButton
        v-radar="{ name: '404 go home button', desc: 'Button to go back to home page' }"
        class="mt-4 h-9 text-lg"
        @click="router.push('/')"
        >{{ $t({ en: 'Return to home page', zh: '回到首页' }) }}</UIButton
      >
    </div>
    <CommunityFooter />
  </div>
</template>
