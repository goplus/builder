<template>
  <div class="self-stretch">
    <div v-if="isBootstrapping" class="min-h-45 self-stretch flex flex-col items-center justify-center gap-6">
      <UILoading />
      <p class="m-0 text-grey-800">
        {{ $t({ en: 'Loading sign-in options…', zh: '正在加载登录选项…' }) }}
      </p>
    </div>

    <template v-else>
      <UIError
        v-if="errorMessage"
        class="mb-2 min-h-50 rounded-lg border border-red-100 bg-red-50/70 px-6"
        :retry="handleRetry"
      >
        {{ $t({ en: 'Something went wrong', zh: '出现了一些问题' }) }}
        <template #sub-message>
          <div class="max-h-20 overflow-auto whitespace-pre-wrap wrap-anywhere">
            {{ errorMessage }}
          </div>
        </template>
      </UIError>

      <AccountSessionSection
        v-else-if="currentSession"
        :session="currentSession"
        :continuing="isCompletingSignIn"
        :switching="isClearingCurrentSession"
        @continue="handleCompleteSignIn"
        @switch-account="handleSwitchAccount"
      />

      <LoginOptionsSection
        v-else-if="!showPasswordForm"
        :providers="providers"
        :disabled="isClearingCurrentSession"
        @select-provider="handleProviderSignIn"
        @open-password="openPasswordLogin"
      />

      <PasswordLoginSection v-else :submit="handlePasswordSignIn" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { UIError, UILoading } from '@/components/ui'

import {
  createPasswordSession,
  deleteCurrentAccountSession,
  getCurrentAccountSession,
  getIdentityProviders,
  type PasswordSignInPayload
} from '@/account-web/apis/account'
import type { CurrentAccountSession, IdentityProvider } from '@/account-web/apis/account'
import {
  buildIdentityProviderAuthorizeUrl,
  buildOAuthAuthorizeUrl,
  clearPendingAuthorization,
  getOAuthError,
  hasPendingAuthorization,
  markPendingAuthorization
} from '@/account-web/utils/oauth'
import type { OAuthContext } from '@/account-web/utils/oauth'

import AccountSessionSection from './AccountSessionSection.vue'
import LoginOptionsSection from './LoginOptionsSection.vue'
import PasswordLoginSection from './PasswordLoginSection.vue'

const props = defineProps<{
  authContext: OAuthContext
}>()

const authContext = props.authContext

const currentSession = ref<CurrentAccountSession | null>(null)
const providers = ref<IdentityProvider[]>([])
const isBootstrapping = ref(true)
const isCompletingSignIn = ref(false)
const isClearingCurrentSession = ref(false)
const showPasswordForm = ref(false)
const errorMessage = ref<string | null>(null)

function setErrorMessage(message: string) {
  errorMessage.value = message
}

function goTo(url: string) {
  window.location.assign(url)
}

function openPasswordLogin() {
  showPasswordForm.value = true
}

function completeSignInWithCurrentAccount() {
  isCompletingSignIn.value = true
  errorMessage.value = null
  clearPendingAuthorization(authContext)
  goTo(buildOAuthAuthorizeUrl(authContext))
}

async function bootstrap() {
  isBootstrapping.value = true

  const oauthError = getOAuthError()
  if (oauthError != null) {
    clearPendingAuthorization(authContext)
    setErrorMessage(oauthError)
  } else {
    errorMessage.value = null
  }

  try {
    const [session, providerList] = await Promise.all([getCurrentAccountSession(), getIdentityProviders(authContext)])
    currentSession.value = session
    providers.value = providerList
    showPasswordForm.value = false

    if (session != null && hasPendingAuthorization(authContext) && oauthError == null) {
      completeSignInWithCurrentAccount()
      return
    }
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : String(error))
  } finally {
    isBootstrapping.value = false
  }
}

function handleCompleteSignIn() {
  completeSignInWithCurrentAccount()
}

async function handleSwitchAccount() {
  isClearingCurrentSession.value = true
  errorMessage.value = null
  try {
    await deleteCurrentAccountSession()
    currentSession.value = null
    showPasswordForm.value = false
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : String(error))
  } finally {
    isClearingCurrentSession.value = false
  }
}

function handleProviderSignIn(provider: IdentityProvider) {
  errorMessage.value = null
  markPendingAuthorization(authContext)
  goTo(buildIdentityProviderAuthorizeUrl(provider.name, authContext))
}

async function handlePasswordSignIn(payload: PasswordSignInPayload) {
  errorMessage.value = null

  await createPasswordSession(payload)
  clearPendingAuthorization(authContext)
  goTo(buildOAuthAuthorizeUrl(authContext))
}

function handleRetry() {
  void bootstrap()
}

onMounted(() => {
  void bootstrap()
})
</script>
