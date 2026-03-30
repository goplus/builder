<template>
  <main class="page">
    <section class="card">
      <SignInHero :hero-src="heroSrc" />
      <SignInPanel
        :loading="loading"
        :logo-src="logoSrc"
        :wechat-icon-src="wechatIconSrc"
        :qq-icon-src="qqIconSrc"
        @wechat="handleWeChat"
        @qq="handleQQ"
        @password="handlePassword"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoSrc from '@/assets/logo.svg'
import SignInHero from '@/components/sign-in/SignInHero.vue'
import SignInPanel from '@/components/sign-in/SignInPanel.vue'
import {
  initiateQQSignIn,
  initiateSignIn,
  initiateWeChatSignIn,
  normalizeSafeReturnTo,
  useSignedInStateQuery
} from '@/stores/user'
import { usePageTitle } from '@/utils/utils'
import heroSrc from './assets/sign-in-hero.svg'
import qqIconSrc from './assets/icon-qq.svg'
import wechatIconSrc from './assets/icon-wechat.svg'

const route = useRoute()
const router = useRouter()
const signedInStateQuery = useSignedInStateQuery()
const returnTo = computed(() => normalizeSafeReturnTo(route.query.returnTo as string | undefined))
const loading = ref<null | 'wechat' | 'qq' | 'password'>(null)

usePageTitle({ en: 'Sign in', zh: '登录' })

watchEffect(() => {
  const state = signedInStateQuery.data.value
  if (state?.isSignedIn) router.replace(returnTo.value)
})

function handleWeChat() {
  loading.value = 'wechat'
  initiateWeChatSignIn(returnTo.value)
}

function handleQQ() {
  loading.value = 'qq'
  initiateQQSignIn(returnTo.value)
}

function handlePassword() {
  loading.value = 'password'
  initiateSignIn(returnTo.value)
}
</script>

<style scoped lang="scss">
.page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  overflow: hidden;
  background:
    radial-gradient(circle at 16% 15%, rgba(134, 168, 228, 0.26) 0%, transparent 34%),
    radial-gradient(circle at 81% 82%, rgba(111, 214, 221, 0.2) 0%, transparent 32%),
    linear-gradient(135deg, #f4f7ff 0%, #eff3fd 42%, #e8f7fb 100%);

  &::before,
  &::after {
    content: '';
    position: absolute;
    inset: -12%;
    pointer-events: none;
  }

  &::before {
    background:
      repeating-radial-gradient(circle at 16% 15%, rgba(133, 163, 220, 0.22) 0 1px, transparent 1px 12px),
      repeating-radial-gradient(circle at 82% 83%, rgba(86, 194, 202, 0.18) 0 1px, transparent 1px 12px);
    opacity: 0.36;
  }

  &::after {
    background:
      radial-gradient(circle at 52% 52%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0) 58%);
    opacity: 0.9;
  }
}

.card {
  position: relative;
  z-index: 1;
  width: min(100%, 1000px);
  min-height: 600px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 32px -12px rgba(64, 186, 196, 0.18);
  backdrop-filter: blur(14px);
}

@media (max-width: 960px) {
  .page {
    padding: 20px;
  }

  .card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page {
    padding: 16px;
  }
}
</style>
