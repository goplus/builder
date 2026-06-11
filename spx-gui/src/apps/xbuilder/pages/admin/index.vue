<template>
  <div class="h-full w-full flex flex-col overflow-y-auto bg-grey-300">
    <NavbarWrapper class="bg-grey-100 border-b border-grey-400" centered />
    <main class="flex-1 bg-grey-100">
      <div v-if="signedInStateQuery.isLoading.value" class="h-full min-h-80 flex items-center justify-center">
        <UILoading />
      </div>
      <UIError v-else-if="signedInStateQuery.error.value != null" class="h-full min-h-80">
        {{ $t(signedInStateQuery.error.value.userMessage) }}
      </UIError>
      <UIError v-else-if="!canUseAccountAdmin" class="h-full min-h-80">
        {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
        <template #sub-message>
          {{ $t({ en: 'This page is only available to Account administrators.', zh: '此页面仅账号管理员可访问。' }) }}
        </template>
      </UIError>
      <div v-else class="mx-auto max-w-[1280px] px-8 py-8">
        <header class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="m-0 text-2xl font-semibold text-title">{{ $t({ en: 'Account admin', zh: '账号管理' }) }}</h1>
            <p class="m-0 mt-1 text-sm text-grey-800">
              {{
                $t({
                  en: 'Manage Account users, OAuth apps, and audit logs.',
                  zh: '管理账号用户、OAuth 应用和审计日志。'
                })
              }}
            </p>
          </div>
        </header>

        <div class="grid grid-cols-[180px_minmax(0,1fr)] gap-6">
          <nav class="flex flex-col gap-1">
            <RouterLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="rounded-md px-3 py-2 text-sm text-grey-900 no-underline hover:bg-grey-300"
              active-class="bg-primary-200! text-primary-main!"
            >
              {{ $t(item.label) }}
            </RouterLink>
          </nav>
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

import { useSignedInStateQuery } from '@/stores/user'
import { UIError, UILoading } from '@/components/ui'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'

const signedInStateQuery = useSignedInStateQuery()
const signedInUser = computed(() => signedInStateQuery.data.value?.user ?? null)
const canManageAccount = computed(() => signedInUser.value?.capabilities.canManageAccount === true)
const canUseAccountAdmin = computed(
  () =>
    signedInUser.value?.capabilities.canManageAccount === true ||
    signedInUser.value?.capabilities.canManageAuthorization === true
)

const navItems = computed(() => [
  ...(canManageAccount.value
    ? [
        { to: '/admin/users', label: { en: 'Users', zh: '用户' } },
        { to: '/admin/apps', label: { en: 'OAuth apps', zh: 'OAuth 应用' } }
      ]
    : []),
  { to: '/admin/audit-logs', label: { en: 'Audit logs', zh: '审计日志' } }
])
</script>
