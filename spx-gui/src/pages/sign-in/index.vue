<template>
  <main class="page">
    <section class="card">
      <h1 class="title">{{ $t({ en: 'Sign in', zh: '登录' }) }}</h1>
      <div class="brand">XBuilder</div>
      <UIButton class="wechat" color="primary" @click="handleWeChat">
        {{ $t({ en: 'Use WeChat to sign in', zh: '使用微信登录' }) }}
      </UIButton>
      <UIButton class="qq" color="white" variant="stroke" @click="handleQQ">
        {{ $t({ en: 'Use QQ to sign in', zh: '使用 QQ 登录' }) }}
      </UIButton>
      <button class="password" type="button" @click="handlePassword">
        {{ $t({ en: 'Sign in with username and password', zh: '用户名密码登录' }) }}
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UIButton } from '@/components/ui'
import {
  initiateQQSignIn,
  initiateSignIn,
  initiateWeChatSignIn,
  normalizeSafeReturnTo,
  useSignedInStateQuery
} from '@/stores/user'
import { usePageTitle } from '@/utils/utils'

const route = useRoute()
const router = useRouter()
const signedInStateQuery = useSignedInStateQuery()
const returnTo = computed(() => normalizeSafeReturnTo(route.query.returnTo as string | undefined))

usePageTitle({ en: 'Sign in', zh: '登录' })

watchEffect(() => {
  const state = signedInStateQuery.data.value
  if (state?.isSignedIn) router.replace(returnTo.value)
})

function handleWeChat() {
  initiateWeChatSignIn(returnTo.value)
}

function handleQQ() {
  initiateQQSignIn(returnTo.value)
}

function handlePassword() {
  initiateSignIn(returnTo.value)
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.card {
  width: min(100%, 420px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
}

.title {
  margin: 0;
}

.brand {
  font-size: 24px;
  font-weight: 700;
}

.password {
  border: none;
  background: none;
  cursor: pointer;
}
</style>
