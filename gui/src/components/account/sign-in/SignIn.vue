<script setup lang="ts">
import { isMobile } from '@/utils/ua'
import type { OAuthRequest } from '@/apis/account'

import mobileBackgroundUrl from './bg-mobile.svg'
import pcBackgroundUrl from './bg.svg'
import mobileIllustrationUrl from './illustration-mobile.svg'
import pcIllustrationUrl from './illustration.svg'
import Form from './SignInForm.vue'

defineProps<{
  request: OAuthRequest
}>()

const mobile = isMobile()
</script>

<template>
  <div
    v-if="mobile"
    class="min-h-screen w-full bg-[#eff3fd] bg-center bg-cover bg-no-repeat"
    :style="{ backgroundImage: `url(${mobileBackgroundUrl})` }"
  >
    <div
      class="flex min-h-screen w-full flex-col items-center justify-center bg-top bg-[length:100%] bg-no-repeat"
      :style="{ backgroundImage: `url(${mobileIllustrationUrl})` }"
    >
      <div class="w-[295px] pb-15 flex flex-col items-center justify-center">
        <Form :request="request" />
      </div>
    </div>
  </div>

  <div
    v-else
    class="flex min-h-screen w-full flex-col items-center justify-center bg-[#eff3fd] bg-center bg-cover bg-no-repeat"
    :style="{ backgroundImage: `url(${pcBackgroundUrl})` }"
  >
    <div
      class="relative h-150 w-250 rounded-[16px] bg-white/80 py-18 flex items-stretch justify-center shadow-[0_16px_32px_-12px_rgba(64,186,196,0.18)]"
    >
      <h1 class="absolute left-15 top-8 m-0 text-[26px]/9 text-title">{{ $t({ en: 'Sign In', zh: '登录' }) }}</h1>
      <div
        class="flex-1 border-r border-[#e0e7ef] bg-center bg-[length:472px] bg-no-repeat"
        :style="{ backgroundImage: `url(${pcIllustrationUrl})` }"
      ></div>
      <div class="flex-1 flex flex-col items-center justify-center">
        <Form class="px-[85px]" :request="request" />
      </div>
    </div>
  </div>
</template>
