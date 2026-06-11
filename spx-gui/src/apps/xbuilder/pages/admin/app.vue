<template>
  <section class="min-w-0">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <RouterLink class="text-sm text-primary-main no-underline" to="/admin/apps">
          {{ $t({ en: 'Back to apps', zh: '返回应用列表' }) }}
        </RouterLink>
        <h2 class="m-0 mt-2 text-xl font-semibold text-title">
          {{ $t({ en: 'OAuth app details', zh: 'OAuth 应用详情' }) }}
        </h2>
      </div>
      <UIButton type="secondary" @click="refetchAll">{{ $t({ en: 'Refresh', zh: '刷新' }) }}</UIButton>
    </div>

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

    <UILoading v-else-if="appQuery.isLoading.value" class="my-16" />
    <UIError v-else-if="appQuery.error.value != null" class="py-12">
      {{ $t(appQuery.error.value.userMessage) }}
    </UIError>

    <div v-else-if="app != null" class="flex flex-col gap-5">
      <section class="rounded-lg bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="m-0 text-lg font-semibold text-title">{{ app.displayName }}</h3>
          <div class="font-mono text-xs text-grey-700">{{ app.id }}</div>
        </div>
        <form class="grid grid-cols-2 gap-4" @submit.prevent="handleUpdateApp.fn">
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Name', zh: '名称' }) }}
            <UITextInput :value="app.name" readonly />
          </label>
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Display name', zh: '显示名称' }) }}
            <UITextInput v-model:value="displayName" />
          </label>
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Client type', zh: '客户端类型' }) }}
            <UITextInput :value="app.clientType" readonly />
          </label>
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Status', zh: '状态' }) }}
            <UISelect v-model:value="status">
              <UISelectOption value="active">active</UISelectOption>
              <UISelectOption value="disabled">disabled</UISelectOption>
            </UISelect>
          </label>
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Redirect URIs', zh: '回调 URI' }) }}
            <UITextInput v-model:value="redirectURIs" type="textarea" :rows="6" />
          </label>
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Allowed origins', zh: '允许的 Origin' }) }}
            <UITextInput v-model:value="allowedOrigins" type="textarea" :rows="6" />
          </label>
          <div class="text-sm text-grey-800">
            <div>{{ $t({ en: 'Created', zh: '创建时间' }) }}</div>
            <div class="mt-1 text-grey-1000">{{ formatTime(app.createdAt) }}</div>
          </div>
          <div class="text-sm text-grey-800">
            <div>{{ $t({ en: 'Updated', zh: '更新时间' }) }}</div>
            <div class="mt-1 text-grey-1000">{{ formatTime(app.updatedAt) }}</div>
          </div>
          <div class="col-span-2 flex justify-end">
            <UIButton html-type="submit" type="primary" :loading="handleUpdateApp.isLoading.value">
              {{ $t({ en: 'Save app', zh: '保存应用' }) }}
            </UIButton>
          </div>
        </form>
      </section>

      <section class="rounded-lg bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Secrets', zh: '密钥' }) }}</h3>
          <UIButton type="secondary" size="small" @click="secretsQuery.refetch">
            {{ $t({ en: 'Refresh', zh: '刷新' }) }}
          </UIButton>
        </div>
        <form class="mb-4 flex items-end gap-3" @submit.prevent="handleCreateSecret.fn">
          <label class="min-w-0 flex-1 flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Secret name', zh: '密钥名称' }) }}
            <UITextInput v-model:value="secretName" />
          </label>
          <UIButton html-type="submit" type="primary" :loading="handleCreateSecret.isLoading.value">
            {{ $t({ en: 'Create secret', zh: '创建密钥' }) }}
          </UIButton>
        </form>
        <div v-if="createdSecretValue != null" class="mb-4 rounded-md bg-yellow-100 p-3 text-sm text-grey-1000">
          <div class="mb-2 font-medium text-title">
            {{
              $t({
                en: 'Copy this secret now. It will not be shown again.',
                zh: '请立即保存此密钥，之后将无法再次查看。'
              })
            }}
          </div>
          <pre class="m-0 overflow-auto font-mono text-xs">{{ createdSecretValue }}</pre>
        </div>
        <UILoading v-if="secretsQuery.isLoading.value" class="my-10" />
        <UIError v-else-if="secretsQuery.error.value != null" class="py-8">
          {{ $t(secretsQuery.error.value.userMessage) }}
        </UIError>
        <div v-else class="flex flex-col divide-y divide-grey-300">
          <div
            v-for="secret in secretsQuery.data.value?.data ?? []"
            :key="secret.id"
            class="py-3 flex items-center justify-between gap-3"
          >
            <div>
              <div class="font-medium text-title">{{ secret.name }}</div>
              <div class="text-xs text-grey-700">{{ formatTime(secret.createdAt) }}</div>
            </div>
            <UIButton type="red" size="small" @click="deleteSecret(secret.id)">
              {{ $t({ en: 'Delete', zh: '删除' }) }}
            </UIButton>
          </div>
          <div v-if="(secretsQuery.data.value?.data.length ?? 0) === 0" class="py-8 text-center text-grey-800">
            {{ $t({ en: 'No secrets', zh: '暂无密钥' }) }}
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { UIButton, UIError, UILoading, UISelect, UISelectOption, UITextInput } from '@/components/ui'
import * as accountAdminApis from '@/apis/admin/account'
import { formatTime, parseLines } from './common'

const props = defineProps<{
  appID: string
}>()

const i18n = useI18n()
const signedInStateQuery = useSignedInStateQuery()
const canManageAccount = computed(() => signedInStateQuery.data.value?.user?.capabilities.canManageAccount === true)

const appQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return null
    return accountAdminApis.getAccountApp(props.appID)
  },
  {
    en: 'Failed to load Account app',
    zh: '加载账号应用失败'
  }
)
const app = computed(() => appQuery.data.value)

const displayName = ref('')
const status = ref<accountAdminApis.AccountApp['status']>('active')
const redirectURIs = ref('')
const allowedOrigins = ref('')

watch(
  app,
  (value) => {
    if (value == null) return
    displayName.value = value.displayName
    status.value = value.status
    redirectURIs.value = value.redirectURIs.join('\n')
    allowedOrigins.value = value.allowedOrigins.join('\n')
  },
  { immediate: true }
)

const secretsQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return { total: 0, data: [] }
    return accountAdminApis.listAccountAppSecrets(props.appID, { pageIndex: 1, pageSize: 100 })
  },
  { en: 'Failed to load Account app secrets', zh: '加载账号应用密钥失败' }
)

function refetchAll() {
  appQuery.refetch()
  secretsQuery.refetch()
}

const handleUpdateApp = useMessageHandle(
  async () => {
    await accountAdminApis.updateAccountApp(props.appID, {
      displayName: displayName.value.trim(),
      status: status.value,
      redirectURIs: parseLines(redirectURIs.value),
      allowedOrigins: parseLines(allowedOrigins.value)
    })
    appQuery.refetch()
  },
  { en: 'Failed to update Account app', zh: '更新账号应用失败' },
  { en: 'Account app updated', zh: '账号应用已更新' }
)

const secretName = ref('')
const createdSecretValue = ref<string | null>(null)

const handleCreateSecret = useMessageHandle(
  async () => {
    const secret = await accountAdminApis.createAccountAppSecret(props.appID, { name: secretName.value.trim() })
    createdSecretValue.value = secret.value
    secretName.value = ''
    secretsQuery.refetch()
  },
  { en: 'Failed to create Account app secret', zh: '创建账号应用密钥失败' },
  { en: 'Account app secret created', zh: '账号应用密钥已创建' }
)

const handleDeleteSecret = useMessageHandle(
  async (secretID: string) => {
    await accountAdminApis.deleteAccountAppSecret(props.appID, secretID)
    secretsQuery.refetch()
  },
  { en: 'Failed to delete Account app secret', zh: '删除账号应用密钥失败' },
  { en: 'Account app secret deleted', zh: '账号应用密钥已删除' }
)

function deleteSecret(secretID: string) {
  if (!window.confirm(i18n.t({ en: 'Delete this secret?', zh: '删除此密钥？' }))) return
  handleDeleteSecret.fn(secretID)
}
</script>
