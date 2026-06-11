<template>
  <main class="flex min-h-screen items-center justify-center bg-grey-100 px-6 py-10">
    <section class="w-full max-w-[480px] rounded-lg border border-grey-300 bg-white px-8 py-7 shadow-sm">
      <h1 class="m-0 text-2xl font-semibold text-title">{{ $t({ en: 'Account', zh: '账号' }) }}</h1>

      <div v-if="loading" class="mt-8 flex flex-col items-center gap-4 py-10 text-grey-800">
        <UILoading />
        <p class="m-0">{{ $t({ en: 'Loading session…', zh: '正在加载登录状态…' }) }}</p>
      </div>

      <div v-else-if="errorMessage != null" class="mt-6 rounded-lg border border-red-100 bg-red-50/70 px-4 py-3">
        <div class="font-medium text-red-700">{{ $t({ en: 'Failed to load session', zh: '无法加载登录状态' }) }}</div>
        <div class="mt-1 whitespace-pre-wrap text-sm text-red-600">{{ errorMessage }}</div>
      </div>

      <div v-else-if="session == null" class="mt-6 rounded-lg border border-grey-300 bg-grey-100 px-4 py-5">
        <div class="text-lg font-medium text-title">{{ $t({ en: 'Not signed in', zh: '未登录' }) }}</div>
        <p class="mt-2 mb-0 text-grey-800">
          {{
            $t({
              en: 'There is no active account session in this browser.',
              zh: '当前浏览器中没有有效的账号登录状态。'
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
import { computed, onMounted, ref } from 'vue'

import { getSession, type AccountSession } from '@/apis/account'
import { UILoading } from '@/components/ui'
import { useAvatarUrl } from '@/stores/user/avatar'
import { usePageTitle } from '@/utils/utils'

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const session = ref<AccountSession | null>(null)

const avatarUrl = useAvatarUrl(() => (session.value == null ? null : session.value.user.avatar))
const initial = computed(() =>
  session.value == null ? '?' : session.value.user.displayName.trim().charAt(0).toUpperCase() || '?'
)

async function loadSession() {
  loading.value = true
  errorMessage.value = null
  try {
    session.value = await getSession()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

usePageTitle({ en: 'Account', zh: '账号' })

onMounted(() => {
  void loadSession()
})
</script>
