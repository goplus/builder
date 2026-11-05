<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@/utils/query'

import { usePageTitle } from '@/utils/utils'
import { useSignedIn } from '@/stores/user'
import { UIError, UILoading, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'
import CenteredWrapper from '@/components/common/CenteredWrapper.vue'
import NavbarDropdown from '@/components/navbar/NavbarDropdown.vue'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'

usePageTitle({ en: 'Admin console', zh: '管理后台' })

const route = useRoute()
const router = useRouter()
const signedIn = useSignedIn()
const signedInUserQuery = useQuery(({ signal }) => signedIn.getUser({ signal }))
const canManageAccount = computed(() => signedIn.user?.capabilities.canManageAccount === true)
const canManageFeedback = computed(() => signedIn.user?.capabilities.canManageFeedback === true)
const canUseAdminConsole = computed(() => signedIn.canUseAdminConsole === true)

const accountNavItems = [
  { to: '/admin/users', label: { en: 'Users', zh: '用户' } },
  { to: '/admin/apps', label: { en: 'OAuth apps', zh: 'OAuth 应用' } }
]
const isAccountRoute = computed(() => accountNavItems.some((item) => route.path.startsWith(item.to)))

function getAdminDefaultRoute(capabilities: {
  canManageAccount: boolean
  canManageAuthorization: boolean
  canManageFeedback: boolean
}) {
  if (capabilities.canManageAccount) return '/admin/users'
  if (capabilities.canManageFeedback) return '/admin/feedback'
  if (capabilities.canManageAuthorization) return '/admin/audit-logs'
  return null
}

watch(
  [() => route.path, signedInUserQuery.isLoading],
  async ([path, isLoading]) => {
    if (isLoading || signedInUserQuery.error.value != null) return
    const user = signedInUserQuery.data.value
    if (user == null) {
      await signedIn.signIn(route.fullPath)
      return
    }

    if (path !== '/admin' && path !== '/admin/') return
    const defaultRoute = getAdminDefaultRoute(user.capabilities)
    if (defaultRoute != null) await router.replace(defaultRoute)
  },
  { immediate: true }
)
</script>

<template>
  <div class="h-full w-full flex flex-col overflow-y-auto bg-grey-200">
    <div class="sticky top-0 z-10 bg-grey-100">
      <NavbarWrapper class="border-b border-grey-400" centered>
        <template #left>
          <div class="flex items-stretch">
            <NavbarDropdown
              v-if="canManageAccount"
              :trigger-radar="{
                name: $t({ en: 'Account admin menu', zh: '账号管理菜单' }),
                desc: 'Open Account admin navigation'
              }"
            >
              <template #trigger>
                <span
                  class="whitespace-nowrap text-sm font-medium"
                  :class="isAccountRoute ? 'text-primary-main' : null"
                  >{{ $t({ en: 'Account admin', zh: '账号管理' }) }}</span
                >
              </template>
              <UIMenu class="min-w-36">
                <UIMenuGroup>
                  <UIMenuItem
                    v-for="item in accountNavItems"
                    :key="item.to"
                    :class="route.path.startsWith(item.to) ? 'bg-primary-100 text-primary-main' : null"
                    @click="router.push(item.to)"
                  >
                    {{ $t(item.label) }}
                  </UIMenuItem>
                </UIMenuGroup>
              </UIMenu>
            </NavbarDropdown>
            <RouterLink
              v-if="canManageFeedback"
              v-radar="{ name: 'Feedback', desc: 'Open admin feedback list' }"
              class="h-full flex items-center whitespace-nowrap px-3 text-sm font-medium no-underline hover:bg-grey-400"
              :class="route.path.startsWith('/admin/feedback') ? 'text-primary-main' : 'text-inherit'"
              to="/admin/feedback"
            >
              {{ $t({ en: 'Feedback', zh: '用户反馈' }) }}
            </RouterLink>
            <RouterLink
              v-if="canUseAdminConsole"
              v-radar="{ name: $t({ en: 'Audit logs', zh: '审计日志' }), desc: 'Open admin audit logs' }"
              class="h-full flex items-center whitespace-nowrap px-3 text-sm font-medium no-underline hover:bg-grey-400"
              :class="route.path.startsWith('/admin/audit-logs') ? 'text-primary-main' : 'text-inherit'"
              to="/admin/audit-logs"
            >
              {{ $t({ en: 'Audit logs', zh: '审计日志' }) }}
            </RouterLink>
          </div>
        </template>
      </NavbarWrapper>
    </div>
    <main class="flex-1">
      <div v-if="signedInUserQuery.isLoading.value" class="h-full min-h-80 flex items-center justify-center">
        <UILoading />
      </div>
      <UIError
        v-else-if="signedInUserQuery.error.value != null"
        class="h-full min-h-80"
        :retry="signedInUserQuery.refetch"
      >
        {{ $t(signedInUserQuery.error.value.userMessage) }}
      </UIError>
      <UIError v-else-if="!canUseAdminConsole" class="h-full min-h-80">
        {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
        <template #sub-message>
          {{
            $t({
              en: 'This page is only available to administrators.',
              zh: '此页面仅管理员可访问。'
            })
          }}
        </template>
      </UIError>
      <CenteredWrapper v-else class="py-6 tablet:py-8" size="large">
        <RouterView />
      </CenteredWrapper>
    </main>
  </div>
</template>
