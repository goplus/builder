<script setup lang="ts">
import { debounce } from 'lodash'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { Cancelled, DefaultException, useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { useRouteQueryParamInt, useRouteQueryParamStr, useRouteQueryParamStrEnum } from '@/utils/route'
import { usePageTitle } from '@/utils/utils'
import { SortOrder } from '@/apis/common'
import { useSignedInStateQuery } from '@/stores/user'
import {
  UIButton,
  UIError,
  UILoading,
  UIPagination,
  UISelect,
  UISelectOption,
  UITextInput,
  useModal
} from '@/components/ui'
import * as accountAdminApis from '@/apis/admin/account'
import AccountUserImportModal from '@/components/account/admin/account-user-import/AccountUserImportModal.vue'
import { formatTime } from './common'

const signedInStateQuery = useSignedInStateQuery()
const router = useRouter()
const canManageAccount = computed(() => signedInStateQuery.data.value?.user?.capabilities.canManageAccount === true)

const pageSize = 20
const page = useRouteQueryParamInt('p', 1)
const resetPage = (query: Partial<Record<string, string | null>>) => ({ ...query, p: null })
const sortOrder = useRouteQueryParamStrEnum('order', SortOrder, SortOrder.Desc, resetPage)
const keyword = useRouteQueryParamStr('q', '', resetPage)
const keywordInput = ref(keyword.value)
const showCreateForm = ref(false)
const invokeAccountUserImportModal = useModal(AccountUserImportModal)

const createForm = reactive({
  username: '',
  displayName: '',
  password: ''
})

function getAvatarFallbackText(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || '?'
}

function hideBrokenImage(event: Event) {
  ;(event.currentTarget as HTMLImageElement).style.display = 'none'
}

const usersQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return { total: 0, data: [] }
    const params: accountAdminApis.ListAccountUsersParams = {
      pageIndex: page.value,
      pageSize,
      orderBy: 'createdAt',
      sortOrder: sortOrder.value
    }
    if (keyword.value !== '') {
      params.keyword = keyword.value
    }
    return accountAdminApis.listAccountUsers(params)
  },
  { en: 'Failed to load Account users', zh: '加载账号用户失败' }
)

const pageTotal = computed(() => Math.ceil((usersQuery.data.value?.total ?? 0) / pageSize))

const updateKeyword = debounce(() => {
  const nextKeyword = keywordInput.value.trim()
  if (keyword.value === nextKeyword) return
  keyword.value = nextKeyword
}, 300)

watch(keyword, (value) => {
  if (keywordInput.value !== value) keywordInput.value = value
})
watch(keywordInput, updateKeyword)

onUnmounted(() => updateKeyword.cancel())

usePageTitle({ en: 'Users', zh: '用户' })

const handleCreateUser = useMessageHandle(
  async () => {
    const username = createForm.username.trim()
    if (username === '') throw new DefaultException({ en: 'Username is required', zh: '用户名不能为空' })

    const displayName = createForm.displayName.trim() || username
    const password = createForm.password.trim()
    if (password === '') throw new DefaultException({ en: 'Password is required', zh: '密码不能为空' })

    const user = await accountAdminApis.createAccountUser({ username, displayName, password })
    await router.push(`/admin/users/${encodeURIComponent(user.id)}`)
  },
  { en: 'Failed to create Account user', zh: '创建账号用户失败' },
  { en: 'Account user created', zh: '账号用户已创建' }
)

async function handleImportUsers() {
  try {
    await invokeAccountUserImportModal({})
  } catch (e) {
    if (!(e instanceof Cancelled)) throw e
  } finally {
    void usersQuery.refetch()
  }
}
</script>

<template>
  <section class="min-w-0">
    <div class="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 class="m-0 text-xl font-semibold text-title">{{ $t({ en: 'Users', zh: '用户' }) }}</h2>
        <p class="m-0 mt-1 text-sm text-grey-800">
          {{ $t({ en: 'Browse and create Account users.', zh: '浏览和创建账号用户。' }) }}
        </p>
      </div>
      <div v-if="canManageAccount" class="flex flex-wrap justify-end gap-2">
        <UIButton type="white" icon="file" @click="handleImportUsers">
          {{ $t({ en: 'Import users', zh: '导入用户' }) }}
        </UIButton>
        <UIButton
          :icon="showCreateForm ? 'close' : 'plus'"
          :type="showCreateForm ? 'white' : 'primary'"
          @click="showCreateForm = !showCreateForm"
        >
          {{ showCreateForm ? $t({ en: 'Cancel', zh: '取消' }) : $t({ en: 'Create user', zh: '创建用户' }) }}
        </UIButton>
      </div>
    </div>

    <form
      v-if="canManageAccount && showCreateForm"
      class="mb-5 rounded-lg border border-grey-400 bg-white p-5"
      @submit.prevent="handleCreateUser.fn"
    >
      <div class="grid grid-cols-1 gap-4 tablet:grid-cols-3">
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Username', zh: '用户名' }) }}
          <UITextInput v-model:value="createForm.username" required />
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Display name', zh: '显示名称' }) }}
          <UITextInput v-model:value="createForm.displayName" />
          <span class="text-xs text-grey-700">
            {{ $t({ en: 'Leave empty to use username.', zh: '留空则使用用户名。' }) }}
          </span>
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Initial password', zh: '初始密码' }) }}
          <UITextInput v-model:value="createForm.password" type="password" required />
        </label>
      </div>
      <div class="mt-4 flex justify-end">
        <UIButton html-type="submit" type="primary" :loading="handleCreateUser.isLoading.value">
          {{ $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </div>
    </form>

    <UIError v-if="!canManageAccount" class="py-12">
      {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
      <template #sub-message>
        {{
          $t({
            en: 'Managing Account users requires Account admin permission.',
            zh: '管理账号用户需要账号管理员权限。'
          })
        }}
      </template>
    </UIError>

    <div v-else class="overflow-hidden rounded-lg border border-grey-400 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-grey-300 bg-grey-100 px-5 py-3">
        <div class="text-sm text-grey-800">
          {{
            $t({
              en: `${usersQuery.data.value?.total ?? 0} users`,
              zh: `共 ${usersQuery.data.value?.total ?? 0} 位用户`
            })
          }}
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <UITextInput
            v-model:value="keywordInput"
            clearable
            class="w-64 max-w-full"
            :placeholder="$t({ en: 'Username or display name', zh: '用户名或显示名称' })"
          />
          <UISelect v-model:value="sortOrder" class="w-32">
            <UISelectOption value="desc">{{ $t({ en: 'Newest', zh: '最新' }) }}</UISelectOption>
            <UISelectOption value="asc">{{ $t({ en: 'Oldest', zh: '最早' }) }}</UISelectOption>
          </UISelect>
          <UIButton icon="reload" type="white" @click="usersQuery.refetch">
            {{ $t({ en: 'Refresh', zh: '刷新' }) }}
          </UIButton>
        </div>
      </div>
      <UILoading v-if="usersQuery.isLoading.value" class="my-16" />
      <UIError v-else-if="usersQuery.error.value != null" class="py-12">
        {{ $t(usersQuery.error.value.userMessage) }}
      </UIError>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-full border-collapse text-left text-sm tablet:min-w-[760px]">
          <thead class="bg-grey-200 text-grey-800">
            <tr class="border-b border-grey-300">
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'User', zh: '用户' }) }}</th>
              <th class="hidden px-5 py-3 font-medium tablet:table-cell">{{ $t({ en: 'ID', zh: 'ID' }) }}</th>
              <th class="hidden px-5 py-3 font-medium tablet:table-cell">
                {{ $t({ en: 'Created', zh: '创建时间' }) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in usersQuery.data.value?.data ?? []"
              :key="user.id"
              class="border-b border-grey-200 transition-colors last:border-b-0 hover:bg-grey-100"
            >
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-200 font-semibold text-primary-main"
                  >
                    {{ getAvatarFallbackText(user.displayName) }}
                    <img
                      :src="user.avatar"
                      crossorigin="anonymous"
                      class="absolute inset-0 h-full w-full object-cover"
                      @error="hideBrokenImage"
                    />
                  </div>
                  <div>
                    <RouterLink
                      class="font-medium text-title no-underline hover:text-primary-main hover:underline"
                      :to="`/admin/users/${encodeURIComponent(user.id)}`"
                    >
                      {{ user.displayName }}
                    </RouterLink>
                    <div class="text-grey-800">{{ user.username }}</div>
                  </div>
                </div>
              </td>
              <td class="hidden px-5 py-3 font-mono text-xs text-grey-800 tablet:table-cell">{{ user.id }}</td>
              <td class="hidden px-5 py-3 text-grey-900 tablet:table-cell">{{ formatTime(user.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-5 py-4 flex justify-center">
        <UIPagination v-show="pageTotal > 1" v-model:current="page" :total="pageTotal" />
      </div>
    </div>
  </section>
</template>
