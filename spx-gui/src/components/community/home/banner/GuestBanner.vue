<script setup lang="ts">
import { initiateSignIn } from '@/stores/user'
import { UIButton } from '@/components/ui'
import CommunityCard from '../../CommunityCard.vue'
import bgSvg from './bg.svg'

function handleJoin() {
  initiateSignIn()
}
</script>

<template>
  <CommunityCard class="p-3">
    <div
      class="relative rounded-md bg-[#f0faff] bg-no-repeat px-13 pt-12 pb-12.5 text-[#073156]"
      :style="{ backgroundImage: `url(${bgSvg})`, backgroundPosition: 'center right 54px' }"
    >
      <h1 class="text-24">
        {{ $t({ en: 'Join XBuilder', zh: '加入 XBuilder' }) }}
      </h1>
      <h4 class="mt-2 text-13/5">
        {{ $t({ en: 'Build and share your projects', zh: '创作并分享你的作品' }) }}
      </h4>
      <UIButton
        v-radar="{ name: 'Join now button', desc: 'Click to sign in/up' }"
        class="mt-7"
        color="primary"
        size="large"
        @click="handleJoin"
      >
        {{ $t({ en: 'Join now', zh: '立即加入' }) }}
      </UIButton>
    </div>
  </CommunityCard>
</template>
