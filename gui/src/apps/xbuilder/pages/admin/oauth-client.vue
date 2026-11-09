<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { useSignedIn } from '@/stores/user'
import { UIButton, UIDialog, UIError, UILoading, UIPagination, UISwitch, UITextInput } from '@/components/ui'
import CopyButton from '@/components/common/CopyButton.vue'
import * as accountAdminApis from '@/apis/admin/account'
import {
  accountOAuthClientRedirectURIPatternsTip,
  accountOAuthClientRedirectURIsTip,
  accountOAuthClientTypeLabels,
  formatTime,
  parseLines
} from './common'

const props = defineProps<{
  appID: string
  oauthClientID: string
}>()

const signedIn = useSignedIn()
const canManageAccount = computed(() => signedIn.user?.capabilities.canManageAccount === true)

const clientQuery = useQuery(
  async () =>
    canManageAccount.value ? accountAdminApis.getAccountOAuthClient(props.appID, props.oauthClientID) : null,
  { en: 'Failed to load OAuth client', zh: '加载 OAuth 客户端失败' }
)
const client = computed(() => clientQuery.data.value)
usePageTitle(() => ({ en: client.value?.name ?? 'OAuth client', zh: client.value?.name ?? 'OAuth 客户端' }))

const appOnly = computed(() => client.value?.grantTypes.includes('client_credentials') === true)
const active = ref(true)
const redirectURIs = ref('')
watch(
  client,
  (value) => {
    if (value == null) return
    active.value = value.status === 'active'
    redirectURIs.value = value.redirectURIs.join('\n')
  },
  { immediate: true }
)

const callbacksChanged = computed(() => {
  const current = client.value
  if (current == null) return false
  const parsedRedirectURIs = parseLines(redirectURIs.value)
  return (
    parsedRedirectURIs.length !== current.redirectURIs.length ||
    parsedRedirectURIs.some((uri, index) => uri !== current.redirectURIs[index])
  )
})
const statusChanged = computed(
  () => client.value != null && (active.value ? 'active' : 'disabled') !== client.value.status
)
const canSave = computed(
  () => (callbacksChanged.value || statusChanged.value) && (appOnly.value || parseLines(redirectURIs.value).length > 0)
)

const handleSave = useMessageHandle(
  async () => {
    clientQuery.data.value = await accountAdminApis.updateAccountOAuthClient(props.appID, props.oauthClientID, {
      ...(statusChanged.value ? { status: active.value ? 'active' : 'disabled' } : {}),
      ...(callbacksChanged.value && !appOnly.value ? { redirectURIs: parseLines(redirectURIs.value) } : {})
    })
  },
  { en: 'Failed to update OAuth client', zh: '更新 OAuth 客户端失败' },
  { en: 'OAuth client updated', zh: 'OAuth 客户端已更新' }
)

const secretsPage = ref(1)
const secretsQuery = useQuery(
  async () => {
    if (!canManageAccount.value || client.value?.clientType !== 'confidential') return { total: 0, data: [] }
    return accountAdminApis.listAccountOAuthClientSecrets(props.appID, props.oauthClientID, {
      pageIndex: secretsPage.value,
      pageSize: 20
    })
  },
  { en: 'Failed to load client secrets', zh: '加载客户端密钥失败' }
)
const secretsPageTotal = computed(() => Math.ceil((secretsQuery.data.value?.total ?? 0) / 20))

const secretName = ref('')
const createdSecret = ref<accountAdminApis.CreatedAccountOAuthClientSecret | null>(null)
const handleCreateSecret = useMessageHandle(
  async () => {
    createdSecret.value = await accountAdminApis.createAccountOAuthClientSecret(props.appID, props.oauthClientID, {
      name: secretName.value.trim()
    })
    secretName.value = ''
    if (secretsPage.value === 1) secretsQuery.refetch()
    else secretsPage.value = 1
  },
  { en: 'Failed to create client secret', zh: '创建客户端密钥失败' },
  { en: 'Client secret created', zh: '客户端密钥已创建' }
)

const revokeSecretID = ref<string | null>(null)
const handleRevokeSecret = useMessageHandle(
  async () => {
    const id = revokeSecretID.value
    if (id == null) throw new Error('No client secret selected')
    await accountAdminApis.revokeAccountOAuthClientSecret(props.appID, props.oauthClientID, id)
    if (createdSecret.value?.id === id) createdSecret.value = null
    revokeSecretID.value = null
    if (secretsPage.value === 1) secretsQuery.refetch()
    else secretsPage.value = 1
  },
  { en: 'Failed to revoke client secret', zh: '撤销客户端密钥失败' },
  { en: 'Client secret revoked', zh: '客户端密钥已撤销' }
)
</script>

<template>
  <section class="min-w-0">
    <RouterLink class="mb-4 inline-block text-sm text-primary-main" :to="`/admin/apps/${encodeURIComponent(appID)}`">
      {{ $t({ en: 'Back to app', zh: '返回应用详情' }) }}
    </RouterLink>
    <UIError v-if="!canManageAccount" class="py-12">{{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}</UIError>
    <UILoading v-else-if="clientQuery.isLoading.value" class="my-12" />
    <UIError v-else-if="clientQuery.error.value != null" class="py-12">
      {{ $t(clientQuery.error.value.userMessage) }}
    </UIError>
    <template v-else-if="client != null">
      <div class="mb-5 rounded-lg border border-grey-400 bg-white p-5">
        <div class="mb-5 flex items-center justify-between gap-3">
          <h2 class="m-0 text-xl font-semibold text-title">{{ client.name }}</h2>
          <UIButton type="white" icon="reload" @click="clientQuery.refetch">
            {{ $t({ en: 'Refresh', zh: '刷新' }) }}
          </UIButton>
        </div>
        <dl class="mb-5 grid grid-cols-1 gap-3 text-sm tablet:grid-cols-2">
          <div>
            <dt class="text-grey-700">{{ $t({ en: 'Client ID', zh: '客户端标识' }) }}</dt>
            <dd class="m-0 flex items-center gap-2 break-all font-mono">
              {{ client.clientID }}
              <CopyButton :value="client.clientID" :label="{ en: 'Copy client ID', zh: '复制客户端标识' }" />
            </dd>
          </div>
          <div>
            <dt class="text-grey-700">{{ $t({ en: 'Management ID', zh: '管理 ID' }) }}</dt>
            <dd class="m-0">{{ client.id }}</dd>
          </div>
          <div>
            <dt class="text-grey-700">{{ $t({ en: 'Client type', zh: '客户端类型' }) }}</dt>
            <dd class="m-0">{{ $t(accountOAuthClientTypeLabels[client.clientType]) }}</dd>
          </div>
          <div>
            <dt class="text-grey-700">{{ $t({ en: 'Grant types', zh: '授权类型' }) }}</dt>
            <dd class="m-0">{{ client.grantTypes.join(', ') }}</dd>
          </div>
        </dl>
        <form class="flex flex-col gap-4" @submit.prevent="handleSave.fn">
          <label class="flex items-center gap-2 text-sm text-grey-900">
            <UISwitch v-model:value="active" />
            {{ $t({ en: 'Client enabled', zh: '启用客户端' }) }}
          </label>
          <p class="m-0 text-xs text-grey-700">
            {{
              $t({
                en: 'Disabling this client revokes its outstanding authorization flows and tokens. Other clients are unaffected.',
                zh: '停用会使此客户端未完成的授权流程和令牌失效，不影响其他客户端。'
              })
            }}
          </p>
          <template v-if="!appOnly">
            <label class="flex flex-col gap-1 text-sm text-grey-900">
              {{ $t({ en: 'Redirect URIs', zh: '回调 URI' }) }}
              <UITextInput v-model:value="redirectURIs" type="textarea" :rows="4" required />
              <span class="text-xs text-grey-700">{{ $t(accountOAuthClientRedirectURIsTip) }}</span>
            </label>
            <div v-if="client.redirectURIPatterns.length > 0" class="text-sm text-grey-800">
              <p>{{ $t(accountOAuthClientRedirectURIPatternsTip) }}</p>
              <div v-for="pattern in client.redirectURIPatterns" :key="pattern" class="break-all font-mono">
                {{ pattern }}
              </div>
            </div>
          </template>
          <div class="flex justify-end">
            <UIButton html-type="submit" :disabled="!canSave" :loading="handleSave.isLoading.value">
              {{ $t({ en: 'Save', zh: '保存' }) }}
            </UIButton>
          </div>
        </form>
      </div>
      <div v-if="client.clientType === 'confidential'" class="rounded-lg border border-grey-400 bg-white p-5">
        <h3 class="m-0 mb-4 text-lg font-semibold text-title">{{ $t({ en: 'Client secrets', zh: '客户端密钥' }) }}</h3>
        <form class="mb-4 flex flex-wrap items-end gap-3" @submit.prevent="handleCreateSecret.fn">
          <label class="flex flex-1 flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Secret name', zh: '密钥名称' }) }}
            <UITextInput
              v-model:value="secretName"
              required
              :maxlength="accountAdminApis.accountOAuthClientSecretNameMaxLength"
            />
          </label>
          <UIButton
            html-type="submit"
            :disabled="secretName.trim() === ''"
            :loading="handleCreateSecret.isLoading.value"
          >
            {{ $t({ en: 'Create secret', zh: '创建密钥' }) }}
          </UIButton>
        </form>
        <div v-if="createdSecret != null" class="mb-4 rounded bg-yellow-100 p-4 text-sm">
          <p class="m-0 mb-2">
            {{ $t({ en: 'Copy this value now. It is shown only once.', zh: '请立即复制此值，它只会展示一次。' }) }}
          </p>
          <div class="flex items-center gap-2 break-all font-mono">
            {{ createdSecret.value }}
            <CopyButton :value="createdSecret.value" :label="{ en: 'Copy client secret', zh: '复制客户端密钥' }" />
          </div>
          <UIButton class="mt-2" type="white" @click="createdSecret = null">
            {{ $t({ en: 'Dismiss', zh: '关闭' }) }}
          </UIButton>
        </div>
        <UILoading v-if="secretsQuery.isLoading.value" class="my-8" />
        <UIError v-else-if="secretsQuery.error.value != null" class="py-8">
          {{ $t(secretsQuery.error.value.userMessage) }}
        </UIError>
        <template v-else>
          <div
            v-for="secret in secretsQuery.data.value?.data ?? []"
            :key="secret.id"
            class="flex items-center justify-between gap-3 border-b border-grey-200 py-3"
          >
            <div>
              <div class="text-sm font-medium">{{ secret.name }}</div>
              <div class="text-xs text-grey-700">{{ formatTime(secret.createdAt) }}</div>
            </div>
            <UIButton type="red" size="small" @click="revokeSecretID = secret.id">
              {{ $t({ en: 'Revoke...', zh: '撤销...' }) }}
            </UIButton>
          </div>
          <p v-if="secretsQuery.data.value?.total === 0" class="text-sm text-grey-800">
            {{ $t({ en: 'No active client secrets', zh: '暂无有效客户端密钥' }) }}
          </p>
        </template>
        <UIPagination
          v-if="secretsPageTotal > 1"
          v-model:current="secretsPage"
          :total="secretsPageTotal"
          class="mt-4"
        />
      </div>
      <p v-else class="text-sm text-grey-800">
        {{
          $t({
            en: 'Public clients use PKCE and do not have client secrets.',
            zh: '公共客户端使用 PKCE，不持有客户端密钥。'
          })
        }}
      </p>
    </template>
    <UIDialog
      :visible="revokeSecretID != null"
      :mask-closable="!handleRevokeSecret.isLoading.value"
      type="warning"
      :title="$t({ en: 'Revoke client secret', zh: '撤销客户端密钥' })"
      @update:visible="!handleRevokeSecret.isLoading.value && (revokeSecretID = null)"
    >
      <p>
        {{
          $t({
            en: 'This credential will stop authenticating the client. Issued tokens remain valid unless separately revoked.',
            zh: '撤销后此凭证将无法用于客户端认证，已签发的令牌不会因此失效。'
          })
        }}
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <UIButton type="white" :disabled="handleRevokeSecret.isLoading.value" @click="revokeSecretID = null">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton type="red" :loading="handleRevokeSecret.isLoading.value" @click="handleRevokeSecret.fn">
          {{ $t({ en: 'Revoke', zh: '撤销' }) }}
        </UIButton>
      </div>
    </UIDialog>
  </section>
</template>
