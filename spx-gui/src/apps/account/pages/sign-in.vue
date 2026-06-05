<template>
  <UIError v-if="authContext == null" class="min-h-screen bg-grey-100">
    {{ $t({ en: 'Unable to start sign-in', zh: '无法登录' }) }}
    <template #sub-message>
      {{
        $t({
          en: 'Missing OAuth context. Please restart sign-in from the app.',
          zh: '缺少 OAuth 上下文，请从应用内重新发起登录。'
        })
      }}
    </template>
  </UIError>
  <XBuilderLoginPageMobile v-else-if="mobile" :auth-context="authContext" />
  <XBuilderLoginPagePc v-else :auth-context="authContext" />
</template>

<script setup lang="ts">
import { UIError } from '@/components/ui'
import { usePageTitle } from '@/utils/utils'
import { isMobile } from '@/utils/ua'
import { parseOAuthContext } from '@/utils/account/sign-in'

import XBuilderLoginPageMobile from '@/components/sign-in/XBuilderLoginPageMobile/XBuilderLoginPageMobile.vue'
import XBuilderLoginPagePc from '@/components/sign-in/XBuilderLoginPagePc/XBuilderLoginPagePc.vue'

const mobile = isMobile()
const authContext = parseOAuthContext()

usePageTitle({ en: 'Sign in', zh: '登录' })
</script>
