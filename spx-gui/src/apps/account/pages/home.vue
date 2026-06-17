<template>
  <main class="flex min-h-screen items-center justify-center bg-grey-100 px-6 py-10">
    <section class="w-full max-w-120 rounded-lg border border-grey-300 bg-white px-8 py-7 shadow-sm">
      <h1 class="m-0 text-2xl font-semibold text-title">{{ $t({ en: 'XBuilder Account', zh: 'XBuilder 账号' }) }}</h1>

      <div v-if="isLoading" class="mt-8 flex flex-col items-center gap-4 py-10 text-grey-800">
        <UILoading />
        <p class="m-0">{{ $t({ en: 'Loading session…', zh: '正在加载登录状态…' }) }}</p>
      </div>

      <UIError v-else-if="error != null" class="mt-6 rounded-lg" :retry="refetch">
        {{ $t(error.userMessage) }}
      </UIError>

      <div v-else-if="session == null" class="mt-6 rounded-lg border border-grey-300 bg-grey-100 px-4 py-5">
        <div class="text-lg font-medium text-title">{{ $t({ en: 'Not signed in', zh: '未登录' }) }}</div>
        <p class="mt-2 mb-0 text-grey-800">
          {{
            $t({
              en: 'There is no active account session.',
              zh: '没有有效的账号登录状态。'
            })
          }}
        </p>
      </div>

      <div v-else class="mt-6 flex items-center gap-4">
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-turquoise-200 text-3xl font-semibold text-turquoise-600"
        >
          <img
            v-if="avatarUrl != null"
            :src="avatarUrl"
            :alt="session.user.displayName"
            class="h-full w-full object-cover"
          />
          <span v-else>{{ initial }}</span>
        </div>
        <div class="min-w-0">
          <div class="truncate text-xl font-semibold text-title">{{ session.user.displayName }}</div>
          <div class="mt-1 truncate text-grey-800">@{{ session.user.username }}</div>
          <div class="mt-1 truncate text-sm text-grey-700">ID: {{ session.user.id }}</div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { getSession } from '@/apis/account'
import { UIError, UILoading } from '@/components/ui'
import { useAvatarUrl } from '@/stores/user/avatar'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'

const {
  isLoading,
  data: session,
  error,
  refetch
} = useQuery(getSession, {
  en: 'Failed to load session',
  zh: '无法加载登录状态'
})

const avatarUrl = useAvatarUrl(() => session.value?.user.avatar ?? null)
const initial = computed(() =>
  session.value == null ? '?' : session.value.user.displayName.trim().charAt(0).toUpperCase() || '?'
)

usePageTitle({ en: 'XBuilder Account', zh: 'XBuilder 账号' })
</script>
