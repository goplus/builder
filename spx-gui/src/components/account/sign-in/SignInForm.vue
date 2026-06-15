<script lang="ts">
function getPendingAuthorizationKey(request: OAuthRequest) {
  return `builder-account-pending-authorization:${request.clientId}:${request.requestUri}`
}

function hasPendingAuthorization(request: OAuthRequest) {
  return sessionStorage.getItem(getPendingAuthorizationKey(request)) === '1'
}

function markPendingAuthorization(request: OAuthRequest) {
  sessionStorage.setItem(getPendingAuthorizationKey(request), '1')
}

function clearPendingAuthorization(request: OAuthRequest) {
  sessionStorage.removeItem(getPendingAuthorizationKey(request))
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'

import {
  buildIdentityProviderAuthorizeUrl,
  createSessionWithPassword,
  deleteSession,
  getIdentityProviders,
  getSession
} from '@/apis/account'
import type { IdentityProvider, OAuthRequest, PasswordSignInPayload } from '@/apis/account'
import { accountOAuthApis } from '@/apis/account/oauth'
import { UIError, UILoading } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { composeQuery, useQuery } from '@/utils/query'

import CurrentAccount from './CurrentAccount.vue'
import logoUrl from './logo.svg'
import PasswordSection from './password-section/PasswordSection.vue'
import ProviderButton from './provider-button/ProviderButton.vue'

const props = defineProps<{
  request: OAuthRequest
}>()

const showPasswordForm = ref(false)

function handleSignInWithPassword() {
  showPasswordForm.value = true
}

function completeSignInWithCurrentAccount() {
  clearPendingAuthorization(props.request)
  const authorizeUrl = accountOAuthApis.buildAuthorizeUrl({
    client_id: props.request.clientId,
    request_uri: props.request.requestUri
  })
  window.location.assign(authorizeUrl)
}

const sessionQuery = useQuery(getSession, { en: 'Failed to get current session', zh: '获取当前会话失败' })
const idpsQuery = useQuery(() => getIdentityProviders(props.request), {
  en: 'Failed to get identity providers',
  zh: '获取身份提供商列表失败'
})
const initialization = useQuery((ctx) => Promise.all([composeQuery(ctx, sessionQuery), composeQuery(ctx, idpsQuery)]), {
  en: 'Failed to initialize sign-in form',
  zh: '初始化登录表单失败'
})

watch(sessionQuery.data, (session) => {
  if (session != null && hasPendingAuthorization(props.request)) {
    completeSignInWithCurrentAccount()
  }
})

const { fn: handleSwitchAccount, isLoading: isSwitchingAccount } = useMessageHandle(
  async () => {
    await deleteSession()
    showPasswordForm.value = false
    sessionQuery.refetch()
  },
  { en: 'Failed to switch account', zh: '切换账号失败' }
)

function handleSignInWithProvider(provider: IdentityProvider) {
  markPendingAuthorization(props.request)
  window.location.assign(buildIdentityProviderAuthorizeUrl(provider.name, props.request))
}

const { fn: handleSignInWithPasswordSubmit, isLoading: isSubmittingSignInWithPassword } = useMessageHandle(
  async (payload: PasswordSignInPayload) => {
    await createSessionWithPassword(payload)
    completeSignInWithCurrentAccount()
  },
  { en: 'Failed to sign in', zh: '登录失败' }
)
</script>

<template>
  <div class="self-stretch">
    <div
      v-if="initialization.isLoading.value"
      class="min-h-45 self-stretch flex flex-col items-center justify-center gap-6"
    >
      <UILoading />
      <p class="m-0 text-grey-800">
        {{ $t({ en: 'Loading sign-in options…', zh: '正在加载登录选项…' }) }}
      </p>
    </div>

    <UIError
      v-else-if="initialization.error.value != null"
      class="mb-2 min-h-50 rounded-lg px-6"
      :retry="initialization.refetch"
    >
      {{ $t(initialization.error.value.userMessage) }}
    </UIError>

    <template v-else>
      <div class="mb-16 flex flex-col items-center">
        <img :src="logoUrl" alt="XBuilder" class="w-18 mb-3" />
        <h2 class="m-0 text-title text-[24px]/7 font-semibold">XBuilder</h2>
      </div>

      <CurrentAccount
        v-if="sessionQuery.data.value != null"
        :session="sessionQuery.data.value"
        :switching="isSwitchingAccount"
        @continue="completeSignInWithCurrentAccount"
        @switch-account="handleSwitchAccount"
      />

      <div v-else-if="!showPasswordForm" class="self-stretch flex flex-col items-center gap-5">
        <ProviderButton
          v-for="(provider, index) in idpsQuery.data.value ?? []"
          :key="provider.name"
          :provider="provider"
          :primary="index === 0"
          :disabled="isSwitchingAccount || isSubmittingSignInWithPassword"
          @click="handleSignInWithProvider(provider)"
        />
        <a
          class="mt-2 inline-flex items-center gap-1 text-lg/6 text-grey-800 no-underline transition-colors duration-200 hover:text-[#0aa5be]"
          href="#"
          @click.prevent="handleSignInWithPassword"
        >
          {{ $t({ en: 'Sign in with username and password', zh: '用户名密码登录' }) }}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6.33325 4L10.3333 8L6.33325 12"
              stroke="currentColor"
              stroke-width="1.07"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>
      </div>

      <PasswordSection
        v-else
        :is-submitting="isSubmittingSignInWithPassword"
        @submit="handleSignInWithPasswordSubmit"
      />
    </template>
  </div>
</template>
