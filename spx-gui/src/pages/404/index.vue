<script setup lang="ts">
import { useRouter } from 'vue-router'

import { UIButton } from '@/components/ui'
import errorSvg from './error.svg?raw'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'

const router = useRouter()
</script>

<template>
  <div
    v-radar="{ name: '404 page', desc: 'Displayed when a page is not found' }"
    class="bg-grey-200 h-full flex flex-col"
  >
    <CommunityNavbar />
    <div class="w-full flex-1 flex flex-col items-center justify-center gap-4">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="errorSvg"></div>
      <p class="text-2xl text-grey-1000 font-semibold">
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
