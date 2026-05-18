<script setup lang="ts">
import guestBannerBg from '@/assets/community/guest-banner-bg.png'
import { usePrototypeSignIn } from '@/composables/prototypeSignIn'
import UIButton from '@/components/ui/UIButton.vue'
import UICard from '@/components/ui/UICard.vue'

const { openSignInModal } = usePrototypeSignIn()
</script>

<template>
  <UICard class="p-3">
    <div
      class="relative rounded-md bg-[#f0faff] bg-no-repeat px-13 pt-12 pb-12.5 text-[#073156]"
      :style="{
        backgroundImage: `url(${guestBannerBg})`,
        backgroundSize: '270px 190px',
        backgroundPosition: 'center right 54px'
      }"
    >
      <h1 class="m-0 text-[24px]/[1.5] font-medium">Join XBuilder</h1>
      <p class="mt-2 text-sm">Build and share your projects</p>
      <UIButton class="mt-7" type="primary" @click="openSignInModal">Join now</UIButton>
    </div>
  </UICard>
</template>
