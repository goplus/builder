<template>
  <section class="min-w-0">
    <div class="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 class="m-0 text-xl font-semibold text-title">{{ $t({ en: 'OAuth apps', zh: 'OAuth 应用' }) }}</h2>
        <p class="m-0 mt-1 text-sm text-grey-800">
          {{ $t({ en: 'Manage registered OAuth apps.', zh: '管理已注册的 OAuth 应用。' }) }}
        </p>
      </div>
      <UIButton v-if="canManageAccount" type="primary" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? $t({ en: 'Cancel', zh: '取消' }) : $t({ en: 'Create app', zh: '创建应用' }) }}
      </UIButton>
    </div>

    <form
      v-if="canManageAccount && showCreateForm"
      class="mb-5 rounded-lg bg-white p-5 shadow-sm"
      @submit.prevent="handleCreateApp.fn"
    >
      <div class="grid grid-cols-2 gap-4">
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Name', zh: '名称' }) }}
          <UITextInput v-model:value="createForm.name" required />
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Display name', zh: '显示名称' }) }}
          <UITextInput v-model:value="createForm.displayName" required />
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Client type', zh: '客户端类型' }) }}
          <UISelect v-model:value="createForm.clientType">
            <UISelectOption value="public">public</UISelectOption>
            <UISelectOption value="confidential">confidential</UISelectOption>
          </UISelect>
        </label>
        <div></div>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Redirect URIs', zh: '回调 URI' }) }}
          <UITextInput v-model:value="createForm.redirectURIs" type="textarea" :rows="4" />
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Allowed origins', zh: '允许的 Origin' }) }}
          <UITextInput v-model:value="createForm.allowedOrigins" type="textarea" :rows="4" />
        </label>
      </div>
      <div class="mt-4 flex justify-end">
        <UIButton html-type="submit" type="primary" :loading="handleCreateApp.isLoading.value">
          {{ $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </div>
    </form>

    <UIError v-if="!canManageAccount" class="py-12">
      {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
      <template #sub-message>
        {{
          $t({
            en: 'Managing OAuth apps requires Account admin permission.',
            zh: '管理 OAuth 应用需要账号管理员权限。'
          })
        }}
      </template>
    </UIError>

    <div v-else class="rounded-lg bg-white shadow-sm">
      <div class="border-b border-grey-300 px-5 py-3 flex items-center justify-end gap-2">
        <UISelect v-model:value="sortOrder" class="w-32">
          <UISelectOption value="desc">{{ $t({ en: 'Newest', zh: '最新' }) }}</UISelectOption>
          <UISelectOption value="asc">{{ $t({ en: 'Oldest', zh: '最早' }) }}</UISelectOption>
        </UISelect>
        <UIButton type="secondary" size="small" @click="appsQuery.refetch">
          {{ $t({ en: 'Refresh', zh: '刷新' }) }}
        </UIButton>
      </div>
      <UILoading v-if="appsQuery.isLoading.value" class="my-16" />
      <UIError v-else-if="appsQuery.error.value != null" class="py-12">
        {{ $t(appsQuery.error.value.userMessage) }}
      </UIError>
      <table v-else class="w-full border-collapse text-left text-sm">
        <thead class="text-grey-800">
          <tr class="border-b border-grey-300">
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'App', zh: '应用' }) }}</th>
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'Type', zh: '类型' }) }}</th>
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'Status', zh: '状态' }) }}</th>
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'Created', zh: '创建时间' }) }}</th>
            <th class="px-5 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in appsQuery.data.value?.data ?? []" :key="app.id" class="border-b border-grey-200">
            <td class="px-5 py-3">
              <div class="font-medium text-title">{{ app.displayName }}</div>
              <div class="font-mono text-xs text-grey-800">{{ app.name }}</div>
            </td>
            <td class="px-5 py-3">{{ app.clientType }}</td>
            <td class="px-5 py-3">{{ app.status }}</td>
            <td class="px-5 py-3">{{ formatTime(app.createdAt) }}</td>
            <td class="px-5 py-3 text-right">
              <RouterLink class="text-primary-main no-underline" :to="`/admin/apps/${encodeURIComponent(app.id)}`">
                {{ $t({ en: 'Open', zh: '打开' }) }}
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="px-5 py-4 flex justify-center">
        <UIPagination v-show="pageTotal > 1" v-model:current="page" :total="pageTotal" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { UIButton, UIError, UILoading, UIPagination, UISelect, UISelectOption, UITextInput } from '@/components/ui'
import * as accountAdminApis from '@/apis/admin/account'
import { formatTime, parseLines } from './common'

const signedInStateQuery = useSignedInStateQuery()
const canManageAccount = computed(() => signedInStateQuery.data.value?.user?.capabilities.canManageAccount === true)

const pageSize = 20
const page = ref(1)
const sortOrder = ref<'asc' | 'desc'>('desc')
const showCreateForm = ref(false)

const createForm = reactive({
  name: '',
  displayName: '',
  clientType: 'public' as accountAdminApis.AccountApp['clientType'],
  redirectURIs: '',
  allowedOrigins: ''
})

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

const handleCreateApp = useMessageHandle(
  async () => {
    await accountAdminApis.createAccountApp({
      name: createForm.name.trim(),
      displayName: createForm.displayName.trim(),
      clientType: createForm.clientType,
      redirectURIs: parseLines(createForm.redirectURIs),
      allowedOrigins: parseLines(createForm.allowedOrigins)
    })
    createForm.name = ''
    createForm.displayName = ''
    createForm.clientType = 'public'
    createForm.redirectURIs = ''
    createForm.allowedOrigins = ''
    showCreateForm.value = false
    appsQuery.refetch()
  },
  { en: 'Failed to create Account app', zh: '创建账号应用失败' },
  { en: 'Account app created', zh: '账号应用已创建' }
)
</script>
