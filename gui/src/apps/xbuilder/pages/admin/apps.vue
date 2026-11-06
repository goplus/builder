<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useAction, useMessageHandle } from '@/utils/exception'
import { getCleanupSignal } from '@/utils/disposable'
import { useQuery } from '@/utils/query'
import { useRouteQueryParamInt, useRouteQueryParamStrEnum } from '@/utils/route'
import { usePageTitle } from '@/utils/utils'
import { SortOrder } from '@/apis/common'
import { useSignedIn } from '@/stores/user'
import {
  UIButton,
  UIError,
  UILoading,
  UIPagination,
  UISelect,
  UISelectOption,
  UISwitch,
  UITextInput
} from '@/components/ui'
import * as accountAdminApis from '@/apis/admin/account'
import { accountAppOnlyScopesTip, accountAppStatusLabels, formatTime } from './common'

const signedIn = useSignedIn()
const router = useRouter()
const signal = getCleanupSignal(onUnmounted)
const canManageAccount = computed(() => signedIn.user?.capabilities.canManageAccount === true)

const pageSize = 20
const page = useRouteQueryParamInt('p', 1)
const resetPage = (query: Partial<Record<string, string | null>>) => ({ ...query, p: null })
const sortOrder = useRouteQueryParamStrEnum('order', SortOrder, SortOrder.Desc, resetPage)
const showCreateForm = ref(false)

const createForm = reactive({
  name: '',
  displayName: '',
  description: '',
  readApps: false,
  readUsers: false,
  reason: ''
})
const canCreate = computed(
  () =>
    createForm.name.trim() !== '' && (!(createForm.readApps || createForm.readUsers) || createForm.reason.trim() !== '')
)

const appsQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return { total: 0, data: [] }
    return accountAdminApis.listAccountApps({
      pageIndex: page.value,
      pageSize,
      orderBy: 'createdAt',
      sortOrder: sortOrder.value
    })
  },
  { en: 'Failed to load Account apps', zh: '加载账号应用失败' }
)

const pageTotal = computed(() => Math.ceil((appsQuery.data.value?.total ?? 0) / pageSize))

usePageTitle({ en: 'Account apps', zh: '账号应用' })

const createApp = useAction(
  () => {
    const scopes: accountAdminApis.AccountAppOnlyScope[] = []
    if (createForm.readApps) scopes.push('account:app:read')
    if (createForm.readUsers) scopes.push('account:user:read')
    return accountAdminApis.createAccountApp({
      name: createForm.name.trim(),
      ...(createForm.displayName.trim() === '' ? {} : { displayName: createForm.displayName.trim() }),
      ...(createForm.description === '' ? {} : { description: createForm.description }),
      clientCredentialsScopes: scopes,
      ...(createForm.reason.trim() === '' ? {} : { reason: createForm.reason.trim() })
    })
  },
  { en: 'Failed to create Account app', zh: '创建账号应用失败' }
)
const handleCreateApp = useMessageHandle(
  async () => {
    const app = await createApp()
    signal.throwIfAborted()
    await router.push(`/admin/apps/${encodeURIComponent(app.id)}`)
  },
  undefined,
  { en: 'Account app created', zh: '账号应用已创建' }
)
</script>

<template>
  <section class="min-w-0">
    <div class="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 class="m-0 text-xl font-semibold text-title">{{ $t({ en: 'Account apps', zh: '账号应用' }) }}</h2>
        <p class="m-0 mt-1 text-sm text-grey-800">
          {{ $t({ en: 'Manage registered Account apps.', zh: '管理已登记的账号应用。' }) }}
        </p>
      </div>
      <UIButton
        v-if="canManageAccount"
        :icon="showCreateForm ? 'close' : 'plus'"
        :type="showCreateForm ? 'white' : 'primary'"
        @click="showCreateForm = !showCreateForm"
      >
        {{ showCreateForm ? $t({ en: 'Cancel', zh: '取消' }) : $t({ en: 'Create app', zh: '创建应用' }) }}
      </UIButton>
    </div>

    <form
      v-if="canManageAccount && showCreateForm"
      class="mb-5 rounded-lg border border-grey-400 bg-white p-5"
      @submit.prevent="handleCreateApp.fn"
    >
      <div class="grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'App name', zh: '应用名称' }) }}
          <UITextInput v-model:value="createForm.name" required />
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Display name', zh: '显示名称' }) }}
          <UITextInput
            v-model:value="createForm.displayName"
            :maxlength="accountAdminApis.accountAppDisplayNameMaxLength"
          />
          <span class="text-xs text-grey-700">{{
            $t({ en: 'Defaults to the app name when left blank.', zh: '留空时使用应用名称。' })
          }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900 tablet:col-span-2">
          {{ $t({ en: 'Description', zh: '说明' }) }}
          <UITextInput v-model:value="createForm.description" type="textarea" :rows="3" :maxlength="200" />
        </label>
        <div class="flex flex-col gap-3 tablet:col-span-2">
          <h3 class="m-0 text-base font-semibold text-title">
            {{ $t({ en: 'App-only access', zh: '应用自主访问' }) }}
          </h3>
          <label class="flex items-center gap-2 text-sm text-grey-900">
            <UISwitch v-model:value="createForm.readApps" />
            account:app:read
          </label>
          <label class="flex items-center gap-2 text-sm text-grey-900">
            <UISwitch v-model:value="createForm.readUsers" />
            account:user:read
          </label>
          <p class="m-0 text-xs text-grey-700">{{ $t(accountAppOnlyScopesTip) }}</p>
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Reason for permission change', zh: '权限变更说明' }) }}
            <UITextInput
              v-model:value="createForm.reason"
              :maxlength="500"
              :required="createForm.readApps || createForm.readUsers"
            />
          </label>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <UIButton html-type="submit" type="primary" :disabled="!canCreate" :loading="handleCreateApp.isLoading.value">
          {{ $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </div>
    </form>

    <UIError v-if="!canManageAccount" class="py-12">
      {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
      <template #sub-message>
        {{
          $t({
            en: 'Managing Account apps requires Account admin permission.',
            zh: '管理账号应用需要账号管理员权限。'
          })
        }}
      </template>
    </UIError>

    <div v-else class="overflow-hidden rounded-lg border border-grey-400 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-grey-300 bg-grey-100 px-5 py-3">
        <div class="text-sm text-grey-800">
          {{
            $t({ en: `${appsQuery.data.value?.total ?? 0} apps`, zh: `共 ${appsQuery.data.value?.total ?? 0} 个应用` })
          }}
        </div>
        <div class="flex items-center gap-2">
          <UISelect v-model:value="sortOrder" class="w-32">
            <UISelectOption value="desc">{{ $t({ en: 'Newest', zh: '最新' }) }}</UISelectOption>
            <UISelectOption value="asc">{{ $t({ en: 'Oldest', zh: '最早' }) }}</UISelectOption>
          </UISelect>
          <UIButton icon="reload" type="white" @click="appsQuery.refetch">
            {{ $t({ en: 'Refresh', zh: '刷新' }) }}
          </UIButton>
        </div>
      </div>
      <UILoading v-if="appsQuery.isLoading.value" class="my-16" />
      <UIError v-else-if="appsQuery.error.value != null" class="py-12">
        {{ $t(appsQuery.error.value.userMessage) }}
      </UIError>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-full border-collapse text-left text-sm tablet:min-w-[760px]">
          <thead class="bg-grey-200 text-grey-800">
            <tr class="border-b border-grey-300">
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'App', zh: '应用' }) }}</th>
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'Availability', zh: '可用状态' }) }}</th>
              <th class="hidden px-5 py-3 font-medium tablet:table-cell">
                {{ $t({ en: 'Created', zh: '创建时间' }) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="appsQuery.data.value?.total === 0">
              <td colspan="3" class="px-5 py-8 text-center text-grey-800">
                {{ $t({ en: 'No apps registered', zh: '暂无已登记应用' }) }}
              </td>
            </tr>
            <tr
              v-for="app in appsQuery.data.value?.data ?? []"
              :key="app.id"
              class="border-b border-grey-200 transition-colors last:border-b-0 hover:bg-grey-100"
            >
              <td class="px-5 py-3">
                <RouterLink
                  class="font-medium text-title no-underline hover:text-primary-main hover:underline"
                  :to="`/admin/apps/${encodeURIComponent(app.id)}`"
                >
                  {{ app.displayName }}
                </RouterLink>
                <div class="font-mono text-xs text-grey-800">{{ app.name }}</div>
              </td>
              <td class="px-5 py-3">
                <span
                  class="inline-flex rounded px-2 py-1 text-xs font-medium"
                  :class="app.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-grey-300 text-grey-800'"
                >
                  {{ $t(accountAppStatusLabels[app.status]) }}
                </span>
              </td>
              <td class="hidden px-5 py-3 tablet:table-cell">{{ formatTime(app.createdAt) }}</td>
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
