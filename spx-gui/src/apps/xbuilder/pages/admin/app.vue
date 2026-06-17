<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { UIButton, UIError, UILoading, UISwitch, UITextInput } from '@/components/ui'
import CopyButton from '@/components/common/CopyButton.vue'
import UIIcon from '@/components/ui/icons/UIIcon.vue'
import * as accountAdminApis from '@/apis/admin/account'
import {
  accountAppAllowedOriginsTip,
  accountAppClientTypeLabels,
  accountAppRedirectURIPatternsTip,
  accountAppRedirectURIsTip,
  accountAppStatusLabels,
  formatTime,
  parseLines
} from './common'

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
const savedDisplayName = ref('')
const savedStatus = ref<accountAdminApis.AccountApp['status']>('active')
const savedRedirectURIs = ref<string[]>([])
const savedAllowedOrigins = ref<string[]>([])
const appUpdatedAt = ref('')
const appFallbackText = computed(() => displayName.value.trim().charAt(0).toUpperCase() || '?')

watch(
  app,
  (value) => {
    if (value == null) return
    displayName.value = value.displayName
    status.value = value.status
    redirectURIs.value = value.redirectURIs.join('\n')
    allowedOrigins.value = value.allowedOrigins.join('\n')
    savedDisplayName.value = value.displayName
    savedStatus.value = value.status
    savedRedirectURIs.value = value.redirectURIs
    savedAllowedOrigins.value = value.allowedOrigins
    appUpdatedAt.value = value.updatedAt
  },
  { immediate: true }
)

const parsedRedirectURIs = computed(() => parseLines(redirectURIs.value))
const parsedAllowedOrigins = computed(() => parseLines(allowedOrigins.value))
const isActive = computed(() => status.value === 'active')
const isIdentityChanged = computed(
  () => displayName.value.trim() !== '' && displayName.value.trim() !== savedDisplayName.value
)
const isStatusChanged = computed(() => status.value !== savedStatus.value)
const areEndpointsChanged = computed(
  () =>
    parsedRedirectURIs.value.length > 0 &&
    (!areStringListsEqual(parsedRedirectURIs.value, savedRedirectURIs.value) ||
      !areStringListsEqual(parsedAllowedOrigins.value, savedAllowedOrigins.value))
)

function areStringListsEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function handleActiveChange(value: boolean) {
  status.value = value ? 'active' : 'disabled'
}

const secretsQuery = useQuery(
  async () => {
    if (!canManageAccount.value || app.value?.clientType !== 'confidential') return { total: 0, data: [] }
    return accountAdminApis.listAccountAppSecrets(props.appID, { pageIndex: 1, pageSize: 100 })
  },
  { en: 'Failed to load Account app secrets', zh: '加载账号应用密钥失败' }
)

function refetchAll() {
  appQuery.refetch()
  secretsQuery.refetch()
}

const handleUpdateIdentity = useMessageHandle(
  async () => {
    const updated = await accountAdminApis.updateAccountApp(props.appID, { displayName: displayName.value.trim() })
    savedDisplayName.value = updated.displayName
    appUpdatedAt.value = updated.updatedAt
  },
  { en: 'Failed to update Account app', zh: '更新账号应用失败' },
  { en: 'App identity updated', zh: '应用信息已更新' }
)

const handleUpdateEndpoints = useMessageHandle(
  async () => {
    const updated = await accountAdminApis.updateAccountApp(props.appID, {
      redirectURIs: parsedRedirectURIs.value,
      allowedOrigins: parsedAllowedOrigins.value
    })
    savedRedirectURIs.value = updated.redirectURIs
    savedAllowedOrigins.value = updated.allowedOrigins
    appUpdatedAt.value = updated.updatedAt
  },
  { en: 'Failed to update OAuth endpoints', zh: '更新 OAuth 地址配置失败' },
  { en: 'OAuth endpoints updated', zh: 'OAuth 地址配置已更新' }
)

const handleUpdateStatus = useMessageHandle(
  async () => {
    const updated = await accountAdminApis.updateAccountApp(props.appID, { status: status.value })
    savedStatus.value = updated.status
    appUpdatedAt.value = updated.updatedAt
  },
  { en: 'Failed to update app availability', zh: '更新应用可用状态失败' },
  { en: 'App availability updated', zh: '应用可用状态已更新' }
)

const secretName = ref('')
const createdSecret = ref<accountAdminApis.CreatedAccountAppSecret | null>(null)

const handleCreateSecret = useMessageHandle(
  async () => {
    const secret = await accountAdminApis.createAccountAppSecret(props.appID, { name: secretName.value.trim() })
    createdSecret.value = secret
    secretName.value = ''
    secretsQuery.refetch()
  },
  { en: 'Failed to create Account app secret', zh: '创建账号应用密钥失败' },
  { en: 'Account app secret created', zh: '账号应用密钥已创建' }
)

const handleCopySecret = useMessageHandle(
  () => navigator.clipboard.writeText(createdSecret.value!.value),
  { en: 'Failed to copy app secret', zh: '复制应用密钥失败' },
  { en: 'App secret copied', zh: '应用密钥已复制' }
)

const handleDeleteSecret = useMessageHandle(
  async (secretID: string) => {
    await accountAdminApis.deleteAccountAppSecret(props.appID, secretID)
    if (createdSecret.value?.id === secretID) createdSecret.value = null
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

<template>
  <section class="min-w-0">
    <RouterLink
      class="mb-4 inline-flex items-center gap-1 text-sm text-primary-main no-underline hover:underline"
      to="/admin/apps"
    >
      <UIIcon class="h-3.5 w-3.5 rotate-180" type="arrowRightSmall" />
      {{ $t({ en: 'Back to apps', zh: '返回应用列表' }) }}
    </RouterLink>

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
      <header class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-4">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary-200 text-xl font-semibold text-primary-main"
          >
            {{ appFallbackText }}
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="m-0 truncate text-xl font-semibold text-title">{{ displayName }}</h2>
              <span
                class="rounded px-2 py-0.5 text-xs font-medium"
                :class="isActive ? 'bg-green-100 text-green-600' : 'bg-grey-300 text-grey-700'"
              >
                {{ $t(accountAppStatusLabels[status]) }}
              </span>
            </div>
            <div class="mt-0.5 flex min-w-0 items-center gap-1 font-mono text-sm text-grey-800">
              <span class="truncate">{{ app.name }}</span>
              <CopyButton :value="app.name" :label="{ en: 'Copy app name', zh: '复制应用名称' }" />
            </div>
            <div class="mt-1 text-xs text-grey-700">
              <span class="flex items-center gap-1">
                <span>{{ $t({ en: 'Client ID', zh: '客户端 ID' }) }}: {{ app.id }}</span>
                <CopyButton :value="app.id" :label="{ en: 'Copy client ID', zh: '复制客户端 ID' }" />
              </span>
            </div>
          </div>
        </div>
        <UIButton
          v-radar="{
            name: $t({ en: 'Refresh app details', zh: '刷新应用详情' }),
            desc: 'Reload app configuration and credentials'
          }"
          icon="reload"
          shape="square"
          type="white"
          :aria-label="$t({ en: 'Refresh app details', zh: '刷新应用详情' })"
          @click="refetchAll"
        />
      </header>

      <div class="grid grid-cols-1 items-start gap-5 desktop:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div class="flex min-w-0 flex-col gap-5">
          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-5">
              <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'App identity', zh: '应用信息' }) }}</h3>
              <p class="m-0 mt-1 text-sm text-grey-800">
                {{
                  $t({
                    en: 'Identifiers and display information for this OAuth client.',
                    zh: '此 OAuth 客户端的标识与展示信息。'
                  })
                }}
              </p>
            </div>
            <form class="flex flex-col gap-5" @submit.prevent="handleUpdateIdentity.fn">
              <div class="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div class="text-sm">
                  <div class="text-grey-800">{{ $t({ en: 'App name', zh: '应用名称' }) }}</div>
                  <div class="mt-1 font-mono font-medium text-title">{{ app.name }}</div>
                  <div class="mt-1 text-xs text-grey-700">
                    {{ $t({ en: 'Permanent internal identifier.', zh: '不可修改的内部标识。' }) }}
                  </div>
                </div>
                <label class="flex flex-col gap-1 text-sm text-grey-900">
                  {{ $t({ en: 'Display name', zh: '显示名称' }) }}
                  <UITextInput v-model:value="displayName" maxlength="100" />
                </label>
                <div class="text-sm">
                  <div class="text-grey-800">{{ $t({ en: 'Client ID', zh: '客户端 ID' }) }}</div>
                  <div class="mt-1 font-mono font-medium text-title">{{ app.id }}</div>
                  <div class="mt-1 text-xs text-grey-700">
                    {{ $t({ en: 'Sent as client_id in OAuth requests.', zh: '在 OAuth 请求中作为 client_id 使用。' }) }}
                  </div>
                </div>
                <div class="text-sm">
                  <div class="text-grey-800">{{ $t({ en: 'Client type', zh: '客户端类型' }) }}</div>
                  <div class="mt-1 font-medium text-title">
                    {{ $t(accountAppClientTypeLabels[app.clientType]) }}
                  </div>
                  <div class="mt-1 text-xs text-grey-700">
                    {{
                      app.clientType === 'public'
                        ? $t({ en: 'Authenticates authorization codes with PKCE.', zh: '通过 PKCE 验证授权码交换。' })
                        : $t({
                            en: 'Authenticates with securely stored client secrets.',
                            zh: '通过安全保存的客户端密钥进行认证。'
                          })
                    }}
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-4 border-t border-grey-300 pt-4 text-sm tablet:grid-cols-2">
                <div>
                  <div class="text-grey-800">{{ $t({ en: 'Created', zh: '创建时间' }) }}</div>
                  <div class="mt-1 text-grey-1000">{{ formatTime(app.createdAt) }}</div>
                </div>
                <div>
                  <div class="text-grey-800">{{ $t({ en: 'Last updated', zh: '最后更新' }) }}</div>
                  <div class="mt-1 text-grey-1000">{{ formatTime(appUpdatedAt) }}</div>
                </div>
              </div>
              <div class="flex justify-end">
                <UIButton
                  html-type="submit"
                  type="primary"
                  :disabled="!isIdentityChanged"
                  :loading="handleUpdateIdentity.isLoading.value"
                >
                  {{ $t({ en: 'Save changes', zh: '保存修改' }) }}
                </UIButton>
              </div>
            </form>
          </section>

          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-5">
              <h3 class="m-0 text-lg font-semibold text-title">
                {{ $t({ en: 'OAuth endpoints', zh: 'OAuth 地址配置' }) }}
              </h3>
              <p class="m-0 mt-1 text-sm text-grey-800">
                {{
                  $t({
                    en: 'Exact destinations and browser origins trusted by this app.',
                    zh: '此应用信任的精确回调地址和浏览器来源。'
                  })
                }}
              </p>
            </div>
            <form class="flex flex-col gap-5" @submit.prevent="handleUpdateEndpoints.fn">
              <label class="flex flex-col gap-1 text-sm text-grey-900">
                {{ $t({ en: 'Redirect URIs', zh: '回调 URI' }) }}
                <UITextInput v-model:value="redirectURIs" type="textarea" :rows="5" />
                <span class="text-xs text-grey-700">{{ $t(accountAppRedirectURIsTip) }}</span>
              </label>
              <div v-if="app.redirectURIPatterns.length > 0" class="flex flex-col gap-2 text-sm text-grey-900">
                <div>{{ $t({ en: 'Redirect URI patterns', zh: '回调 URI 模式' }) }}</div>
                <div class="flex flex-col gap-2 rounded-md border border-grey-300 bg-grey-100 px-3 py-2">
                  <code
                    v-for="pattern in app.redirectURIPatterns"
                    :key="pattern"
                    class="break-all font-mono text-xs text-title"
                  >
                    {{ pattern }}
                  </code>
                </div>
                <span class="text-xs text-grey-700">{{ $t(accountAppRedirectURIPatternsTip) }}</span>
              </div>
              <label class="flex flex-col gap-1 text-sm text-grey-900">
                {{ $t({ en: 'Allowed origins', zh: '允许的 Origin' }) }}
                <UITextInput v-model:value="allowedOrigins" type="textarea" :rows="4" />
                <span class="text-xs text-grey-700">{{ $t(accountAppAllowedOriginsTip) }}</span>
              </label>
              <div class="flex justify-end">
                <UIButton
                  html-type="submit"
                  type="primary"
                  :disabled="!areEndpointsChanged"
                  :loading="handleUpdateEndpoints.isLoading.value"
                >
                  {{ $t({ en: 'Save endpoint settings', zh: '保存地址配置' }) }}
                </UIButton>
              </div>
            </form>
          </section>
        </div>

        <div class="flex min-w-0 flex-col gap-5">
          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="m-0 text-lg font-semibold text-title">
                  {{ $t({ en: 'App availability', zh: '应用可用状态' }) }}
                </h3>
                <p class="m-0 mt-1 text-sm text-grey-800">
                  {{
                    isActive
                      ? $t({ en: 'The app can start and complete OAuth flows.', zh: '应用可以发起并完成 OAuth 流程。' })
                      : $t({ en: 'New OAuth flows for this app are blocked.', zh: '此应用的新 OAuth 流程已被阻止。' })
                  }}
                </p>
              </div>
              <UISwitch
                v-radar="{
                  name: $t({ en: 'App availability', zh: '应用可用状态' }),
                  desc: 'Enable or disable OAuth flows for this app'
                }"
                :value="isActive"
                :aria-label="$t({ en: 'App availability', zh: '应用可用状态' })"
                @update:value="handleActiveChange"
              />
            </div>
            <div
              class="mt-4 rounded-md px-3 py-2 text-sm"
              :class="isActive ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'"
            >
              {{ $t(accountAppStatusLabels[status]) }}
            </div>
            <UIButton
              class="mt-4 w-full"
              type="primary"
              :disabled="!isStatusChanged"
              :loading="handleUpdateStatus.isLoading.value"
              @click="handleUpdateStatus.fn"
            >
              {{ $t({ en: 'Save availability', zh: '保存状态' }) }}
            </UIButton>
          </section>

          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-title">
                  {{ $t({ en: 'Client credentials', zh: '客户端凭证' }) }}
                </h3>
                <p class="m-0 mt-1 text-sm text-grey-800">
                  {{
                    app.clientType === 'confidential'
                      ? $t({
                          en: `${secretsQuery.data.value?.total ?? 0} active secrets`,
                          zh: `共 ${secretsQuery.data.value?.total ?? 0} 个有效密钥`
                        })
                      : $t({ en: 'Public clients do not use client secrets.', zh: '公共客户端不使用客户端密钥。' })
                  }}
                </p>
              </div>
              <UIButton
                v-if="app.clientType === 'confidential'"
                icon="reload"
                type="white"
                size="small"
                @click="secretsQuery.refetch"
              >
                {{ $t({ en: 'Refresh', zh: '刷新' }) }}
              </UIButton>
            </div>

            <div v-if="app.clientType === 'public'" class="rounded-md bg-grey-200 p-4 text-sm text-grey-900">
              <div class="font-medium text-title">{{ $t({ en: 'PKCE required', zh: '必须使用 PKCE' }) }}</div>
              <p class="m-0 mt-1 text-grey-800">
                {{
                  $t({
                    en: 'The app must use an S256 code challenge and verifier instead of a shared secret.',
                    zh: '应用必须使用 S256 code challenge 与 verifier，不能依赖共享密钥。'
                  })
                }}
              </p>
            </div>

            <template v-else>
              <form class="mb-4 flex flex-col gap-3" @submit.prevent="handleCreateSecret.fn">
                <label class="flex flex-col gap-1 text-sm text-grey-900">
                  {{ $t({ en: 'New secret name', zh: '新密钥名称' }) }}
                  <UITextInput v-model:value="secretName" maxlength="100" />
                  <span class="text-xs text-grey-700">
                    {{
                      $t({
                        en: 'Use a name that identifies where the secret is deployed.',
                        zh: '建议使用能标识密钥部署位置的名称。'
                      })
                    }}
                  </span>
                </label>
                <UIButton
                  html-type="submit"
                  type="primary"
                  :disabled="secretName.trim() === ''"
                  :loading="handleCreateSecret.isLoading.value"
                >
                  {{ $t({ en: 'Create secret', zh: '创建密钥' }) }}
                </UIButton>
              </form>

              <div v-if="createdSecret != null" class="mb-4 rounded-md border border-yellow-300 bg-yellow-100 p-4">
                <div class="font-medium text-title">
                  {{ $t({ en: 'Copy this value now', zh: '请立即复制此密钥' }) }}
                </div>
                <p class="m-0 mt-1 text-sm text-grey-900">
                  {{
                    $t({
                      en: 'It will not be shown again after this message is closed.',
                      zh: '关闭此提示后将无法再次查看该值。'
                    })
                  }}
                </p>
                <pre class="mb-0 mt-3 overflow-auto rounded bg-white px-3 py-2 font-mono text-xs text-grey-1000">{{
                  createdSecret.value
                }}</pre>
                <div class="mt-3 flex flex-wrap justify-end gap-2">
                  <UIButton
                    v-radar="{ name: 'Copy app secret', desc: 'Copy the newly created app secret to clipboard' }"
                    icon="copy"
                    type="white"
                    size="small"
                    :loading="handleCopySecret.isLoading.value"
                    @click="handleCopySecret.fn"
                  >
                    {{ $t({ en: 'Copy secret', zh: '复制密钥' }) }}
                  </UIButton>
                  <UIButton type="primary" size="small" @click="createdSecret = null">
                    {{ $t({ en: 'I have saved it', zh: '我已保存' }) }}
                  </UIButton>
                </div>
              </div>

              <UILoading v-if="secretsQuery.isLoading.value" class="my-10" />
              <UIError v-else-if="secretsQuery.error.value != null" class="py-8">
                {{ $t(secretsQuery.error.value.userMessage) }}
              </UIError>
              <div v-else class="flex flex-col divide-y divide-grey-300">
                <div
                  v-for="secret in secretsQuery.data.value?.data ?? []"
                  :key="secret.id"
                  class="flex items-start justify-between gap-3 py-3"
                >
                  <div class="min-w-0 text-sm">
                    <div class="font-medium text-title">{{ secret.name }}</div>
                    <div class="mt-1 flex items-center gap-1 font-mono text-xs text-grey-700">
                      <span>ID {{ secret.id }}</span>
                      <CopyButton :value="secret.id" :label="{ en: 'Copy secret ID', zh: '复制密钥 ID' }" />
                    </div>
                    <div class="mt-1 text-xs text-grey-700">
                      {{ $t({ en: 'Created', zh: '创建时间' }) }}: {{ formatTime(secret.createdAt) }}
                    </div>
                  </div>
                  <UIButton type="red" size="small" @click="deleteSecret(secret.id)">
                    {{ $t({ en: 'Delete', zh: '删除' }) }}
                  </UIButton>
                </div>
                <div v-if="(secretsQuery.data.value?.data.length ?? 0) === 0" class="py-8 text-center text-grey-800">
                  {{ $t({ en: 'No client secrets', zh: '暂无客户端密钥' }) }}
                </div>
              </div>
            </template>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>
