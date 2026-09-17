<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import { untilNotNull, usePageTitle } from '@/utils/utils'
import { useSignIn, useSignedInStateQuery } from '@/stores/user'
import { UIError, UILoading, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'
import CenteredWrapper from '@/components/common/CenteredWrapper.vue'
import NavbarDropdown from '@/components/navbar/NavbarDropdown.vue'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import { canUseAdminConsole as checkCanUseAdminConsole, getAdminDefaultRoute } from '@/apps/xbuilder/admin'

usePageTitle({ en: 'Admin console', zh: '管理后台' })

const route = useRoute()
const router = useRouter()
const signIn = useSignIn()
const signedInStateQuery = useSignedInStateQuery()
const signedInUser = computed(() => signedInStateQuery.data.value?.user ?? null)
const canManageAccount = computed(() => signedInUser.value?.capabilities.canManageAccount === true)
const canUseAdminConsole = computed(() => checkCanUseAdminConsole(signedInUser.value?.capabilities))

const accountNavItems = [
  { to: '/admin/users', label: { en: 'Users', zh: '用户' } },
  { to: '/admin/apps', label: { en: 'OAuth apps', zh: 'OAuth 应用' } }
]
const isAccountRoute = computed(() => accountNavItems.some((item) => route.path.startsWith(item.to)))

watch(
  () => route.path,
  async (path) => {
    if (path !== '/admin' && path !== '/admin/') return

    const signedInState = await untilNotNull(signedInStateQuery.data)
    if (!signedInState.isSignedIn) {
      signIn(route.fullPath)
      return
    }
    const defaultRoute = getAdminDefaultRoute(signedInState.user.capabilities)
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
            <button
              v-if="canUseAdminConsole"
              v-radar="{ name: $t({ en: 'Audit logs', zh: '审计日志' }), desc: 'Open admin audit logs' }"
              class="whitespace-nowrap border-0 bg-transparent px-3 text-sm font-medium hover:bg-grey-400"
              :class="route.path.startsWith('/admin/audit-logs') ? 'text-primary-main' : null"
              type="button"
              @click="router.push('/admin/audit-logs')"
            >
              {{ $t({ en: 'Audit logs', zh: '审计日志' }) }}
            </button>
          </div>
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
