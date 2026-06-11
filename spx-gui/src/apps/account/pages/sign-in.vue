<template>
  <UIError v-if="request == null" class="min-h-screen bg-grey-100">
    {{ $t({ en: 'Unable to start sign-in', zh: '无法登录' }) }}
    <template #sub-message>
      {{
        $t({
          en: 'Missing OAuth request. Please restart sign-in from the app.',
          zh: '缺少 OAuth 请求信息，请从应用内重新发起登录。'
        })
      }}
    </template>
  </UIError>
  <SignIn v-else :request="request" />
</template>

<script setup lang="ts">
import { UIError } from '@/components/ui'
import { usePageTitle } from '@/utils/utils'
import { normalizeLang, useI18n } from '@/utils/i18n'
import type { OAuthRequest } from '@/apis/account'
import SignIn from '@/components/account/sign-in/SignIn.vue'

const i18n = useI18n()

const uiLocales = new URLSearchParams(window.location.search).get('uiLocales')?.trim()
if (uiLocales != null && uiLocales !== '') i18n.setLang(normalizeLang(uiLocales))

function parseRequest(): OAuthRequest | null {
  const params = new URLSearchParams(window.location.search)
  const clientId = params.get('clientID')?.trim() ?? ''
  const requestUri = params.get('requestURI')?.trim() ?? ''
  if (clientId === '' || requestUri === '') return null
  return { clientId, requestUri }
}

const request = parseRequest()

usePageTitle({ en: 'Sign in', zh: '登录' })
</script>
