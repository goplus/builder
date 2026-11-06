<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { SortOrder } from '@/apis/common'
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
import CopyButton from '@/components/common/CopyButton.vue'
import * as accountAdminApis from '@/apis/admin/account'
import { accountAppStatusLabels, accountOAuthClientTypeLabels, parseLines } from './common'

const props = defineProps<{
  appID: string
}>()

const page = ref(1)
const pageSize = 20
const clientsQuery = useQuery(
  () =>
    accountAdminApis.listAccountOAuthClients(props.appID, {
      pageIndex: page.value,
      pageSize,
      sortOrder: SortOrder.Desc
    }),
  { en: 'Failed to load OAuth clients', zh: '加载 OAuth 客户端失败' }
)
const pageTotal = computed(() => Math.ceil((clientsQuery.data.value?.total ?? 0) / pageSize))

const showCreate = ref(false)
const form = reactive({
  name: '',
  purpose: 'authorization_code',
  clientType: 'public',
  refresh: true,
  redirectURIs: '',
  reason: ''
})

const appOnly = computed(() => form.purpose === 'client_credentials')
const canCreate = computed(() => form.name.trim() !== '' && (appOnly.value || parseLines(form.redirectURIs).length > 0))

const handleCreate = useMessageHandle(
  async () => {
    const clientType: accountAdminApis.AccountOAuthClientType =
      appOnly.value || form.clientType === 'confidential' ? 'confidential' : 'public'
    const grantTypes: accountAdminApis.AccountOAuthGrantType[] = appOnly.value
      ? ['client_credentials']
      : form.refresh
        ? ['authorization_code', 'refresh_token']
        : ['authorization_code']
    await accountAdminApis.createAccountOAuthClient(props.appID, {
      name: form.name.trim(),
      clientType,
      grantTypes,
      redirectURIs: appOnly.value ? [] : parseLines(form.redirectURIs),
      ...(form.reason.trim() === '' ? {} : { reason: form.reason.trim() })
    })
    showCreate.value = false
    form.name = ''
    form.redirectURIs = ''
    form.reason = ''
    if (page.value === 1) clientsQuery.refetch()
    else page.value = 1
  },
  { en: 'Failed to create OAuth client', zh: '创建 OAuth 客户端失败' },
  { en: 'OAuth client created', zh: 'OAuth 客户端已创建' }
)
</script>

<template>
  <div class="rounded-lg border border-grey-400 bg-white p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'OAuth clients', zh: 'OAuth 客户端' }) }}</h3>
      <div class="flex gap-2">
        <UIButton type="white" icon="reload" @click="clientsQuery.refetch">
          {{ $t({ en: 'Refresh', zh: '刷新' }) }}
        </UIButton>
        <UIButton @click="showCreate = !showCreate">
          {{ showCreate ? $t({ en: 'Cancel', zh: '取消' }) : $t({ en: 'Create client...', zh: '创建客户端...' }) }}
        </UIButton>
      </div>
    </div>
    <form
      v-if="showCreate"
      class="mb-5 flex flex-col gap-4 rounded-lg bg-grey-100 p-4"
      @submit.prevent="handleCreate.fn"
    >
      <label class="flex flex-col gap-1 text-sm text-grey-900">
        {{ $t({ en: 'Management name', zh: '管理名称' }) }}
        <UITextInput v-model:value="form.name" required :maxlength="100" />
      </label>
      <label class="flex flex-col gap-1 text-sm text-grey-900">
        {{ $t({ en: 'Purpose', zh: '接入用途' }) }}
        <UISelect v-model:value="form.purpose">
          <UISelectOption value="authorization_code">
            {{ $t({ en: 'User authorization', zh: '用户授权' }) }}
          </UISelectOption>
          <UISelectOption value="client_credentials">
            {{ $t({ en: 'App-only access', zh: '应用自主访问' }) }}
          </UISelectOption>
        </UISelect>
      </label>
      <template v-if="!appOnly">
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Client type', zh: '客户端类型' }) }}
          <UISelect v-model:value="form.clientType">
            <UISelectOption value="public">{{ $t(accountOAuthClientTypeLabels.public) }}</UISelectOption>
            <UISelectOption value="confidential">{{ $t(accountOAuthClientTypeLabels.confidential) }}</UISelectOption>
          </UISelect>
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Redirect URIs', zh: '回调 URI' }) }}
          <UITextInput v-model:value="form.redirectURIs" type="textarea" :rows="4" required />
        </label>
        <label class="flex items-center gap-2 text-sm text-grey-900">
          <UISwitch v-model:value="form.refresh" />
          {{ $t({ en: 'Allow refresh tokens', zh: '允许刷新令牌' }) }}
        </label>
      </template>
      <template v-else>
        <p class="m-0 text-sm text-grey-800">
          {{
            $t({
              en: 'App-only clients are confidential and do not use redirect URIs.',
              zh: '应用自主访问使用机密客户端，不配置回调 URI。'
            })
          }}
        </p>
      </template>
      <label class="flex flex-col gap-1 text-sm text-grey-900">
        {{ $t({ en: 'Reason', zh: '用途说明' }) }}
        <UITextInput v-model:value="form.reason" :maxlength="500" />
      </label>
      <div class="flex justify-end">
        <UIButton html-type="submit" :disabled="!canCreate" :loading="handleCreate.isLoading.value">
          {{ $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </div>
    </form>
    <UILoading v-if="clientsQuery.isLoading.value" class="my-8" />
    <UIError v-else-if="clientsQuery.error.value != null" class="py-8">
      {{ $t(clientsQuery.error.value.userMessage) }}
    </UIError>
    <div v-else class="divide-y divide-grey-300">
      <div
        v-for="client in clientsQuery.data.value?.data ?? []"
        :key="client.id"
        class="flex flex-wrap items-center justify-between gap-3 py-4"
      >
        <div>
          <RouterLink
            class="font-medium text-primary-main"
            :to="`/admin/apps/${encodeURIComponent(appID)}/oauth-clients/${encodeURIComponent(client.id)}`"
          >
            {{ client.name }}
          </RouterLink>
          <div class="mt-1 flex items-center gap-2 font-mono text-xs text-grey-800">
            <span>{{ client.clientID }}</span>
            <CopyButton :value="client.clientID" :label="{ en: 'Copy client ID', zh: '复制客户端标识' }" />
          </div>
        </div>
        <div class="text-xs text-grey-800">
          {{ $t(accountOAuthClientTypeLabels[client.clientType]) }} / {{ client.grantTypes.join(', ') }} /
          {{ $t(accountAppStatusLabels[client.status]) }}
        </div>
      </div>
      <div v-if="clientsQuery.data.value?.total === 0" class="py-8 text-center text-grey-800">
        {{ $t({ en: 'No OAuth clients registered', zh: '暂无 OAuth 客户端' }) }}
      </div>
    </div>
    <UIPagination v-if="pageTotal > 1" v-model:current="page" :total="pageTotal" class="mt-4" />
  </div>
</template>
