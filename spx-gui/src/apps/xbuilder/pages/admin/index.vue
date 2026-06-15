<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import { useSignedInStateQuery } from '@/stores/user'
import { UIError, UILoading, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'
import CenteredWrapper from '@/components/common/CenteredWrapper.vue'
import NavbarDropdown from '@/components/navbar/NavbarDropdown.vue'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'

const route = useRoute()
const router = useRouter()
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
        { to: '/admin/apps', label: { en: 'OAuth apps', zh: 'OAuth 应用' } },
        { to: '/admin/audit-logs', label: { en: 'Audit logs', zh: '审计日志' } }
      ]
    : [])
])
</script>

<template>
  <div class="h-full w-full flex flex-col overflow-y-auto bg-grey-200">
    <div class="sticky top-0 z-10 bg-grey-100">
      <NavbarWrapper class="border-b border-grey-400" centered>
        <template #left>
          <NavbarDropdown
            :trigger-radar="{
              name: $t({ en: 'Account admin menu', zh: '账号管理菜单' }),
              desc: 'Open Account admin navigation'
            }"
          >
            <template #trigger>
              <span class="whitespace-nowrap text-sm font-medium">{{
                $t({ en: 'Account admin', zh: '账号管理' })
              }}</span>
            </template>
            <UIMenu class="min-w-36">
              <UIMenuGroup>
                <UIMenuItem
                  v-for="item in navItems"
                  :key="item.to"
                  :class="route.path.startsWith(item.to) ? 'bg-primary-100 text-primary-main' : null"
                  @click="router.push(item.to)"
                >
                  {{ $t(item.label) }}
                </UIMenuItem>
              </UIMenuGroup>
            </UIMenu>
          </NavbarDropdown>
        </template>
      </NavbarWrapper>
    </div>
    <main class="flex-1">
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
      <CenteredWrapper v-else class="py-6 tablet:py-8" size="large">
        <RouterView />
      </CenteredWrapper>
    </main>
  </div>
</template>
