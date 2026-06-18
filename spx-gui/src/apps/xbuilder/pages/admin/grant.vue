<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { UIButton, UIError, UILoading, UISelect, UISelectOption, UITextInput, useConfirmDialog } from '@/components/ui'
import CopyButton from '@/components/common/CopyButton.vue'
import UIIcon from '@/components/ui/icons/UIIcon.vue'
import * as accountAdminApis from '@/apis/admin/account'
import { accountAppClientTypeLabels, accountAppStatusLabels, accountAppTokenTypeLabels, formatTime } from './common'

const props = defineProps<{
  userID: string
  grantID: string
}>()

const i18n = useI18n()
const confirm = useConfirmDialog()
const signedInStateQuery = useSignedInStateQuery()
const canManageAccount = computed(() => signedInStateQuery.data.value?.user?.capabilities.canManageAccount === true)

const userQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return null
    return accountAdminApis.getAccountUser(props.userID)
  },
  { en: 'Failed to load Account user', zh: '加载账号用户失败' }
)
const user = computed(() => userQuery.data.value)

const grantQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return null
    return accountAdminApis.getAccountAppGrant(props.grantID)
  },
  { en: 'Failed to load Account app grant', zh: '加载账号应用授权失败' }
)
const grant = computed(() => grantQuery.data.value)
const app = computed(() => grant.value?.app ?? null)
const appFallbackText = computed(() => app.value?.displayName.trim().charAt(0).toUpperCase() || '?')

const tokenTypeFilter = ref<'all' | accountAdminApis.AccountAppTokenType>('accessToken')
const tokensQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return { total: 0, data: [] }
    return accountAdminApis.listAccountAppGrantTokens(props.grantID, {
      pageIndex: 1,
      pageSize: 100,
      orderBy: 'createdAt',
      sortOrder: 'desc',
      tokenType: tokenTypeFilter.value === 'all' ? undefined : tokenTypeFilter.value
    })
  },
  { en: 'Failed to load Account app grant tokens', zh: '加载账号应用授权 token 失败' }
)

const showCreateForm = ref(false)
const tokenName = ref('')
const createdToken = ref<accountAdminApis.CreatedAccountAppToken | null>(null)
const minExpiresAtInput = ref(formatDateTimeLocal(dayjs()))
const maxExpiresAtInput = ref(formatDateTimeLocal(dayjs().add(365, 'day')))
const expiresAtInput = ref(formatDateTimeLocal(dayjs().add(6, 'month')))
const isCreateTokenValid = computed(
  () =>
    tokenName.value.trim() !== '' &&
    tokenName.value.length <= accountAdminApis.accountAppTokenNameMaxLength &&
    expiresAtInput.value !== ''
)
const maxTokenLifetimeDays = 365

function formatDateTimeLocal(value: dayjs.Dayjs) {
  return value.format('YYYY-MM-DDTHH:mm')
}

function refreshTokenExpirationBounds(now = dayjs()) {
  minExpiresAtInput.value = formatDateTimeLocal(now)
  maxExpiresAtInput.value = formatDateTimeLocal(now.add(maxTokenLifetimeDays, 'day'))
}

function setTokenExpiration(days: number) {
  const now = dayjs()
  refreshTokenExpirationBounds(now)
  const buffer = days >= maxTokenLifetimeDays ? 1 : 0
  expiresAtInput.value = formatDateTimeLocal(now.add(days, 'day').subtract(buffer, 'minute'))
}

function refetchAll() {
  userQuery.refetch()
  grantQuery.refetch()
  tokensQuery.refetch()
}

function resetCreateTokenForm() {
  showCreateForm.value = false
  tokenName.value = ''
  refreshTokenExpirationBounds()
  expiresAtInput.value = formatDateTimeLocal(dayjs().add(6, 'month'))
}

function toggleCreateTokenForm() {
  if (showCreateForm.value) {
    resetCreateTokenForm()
    return
  }
  refreshTokenExpirationBounds()
  showCreateForm.value = true
}

const handleCreateToken = useMessageHandle(
  async () => {
    const token = await accountAdminApis.createAccountAppGrantToken(props.grantID, {
      tokenType: 'accessToken',
      name: tokenName.value.trim(),
      expiresAt: dayjs(expiresAtInput.value).toISOString()
    })
    createdToken.value = token
    tokensQuery.refetch()
  },
  { en: 'Failed to create Access token', zh: '创建 Access token 失败' },
  { en: 'Access token created', zh: 'Access token 已创建' }
)

const handleCopyCreatedToken = useMessageHandle(
  () => navigator.clipboard.writeText(createdToken.value!.value),
  { en: 'Failed to copy Access token', zh: '复制 Access token 失败' },
  { en: 'Access token copied', zh: 'Access token 已复制' }
)

const handleRevokeToken = useMessageHandle(
  async (tokenID: string) => {
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Revoke token', zh: '撤销 token' }),
      content: i18n.t({ en: 'Are you sure to revoke this token?', zh: '确定要撤销此 token 吗？' }),
      confirmText: i18n.t({ en: 'Revoke', zh: '撤销' })
    })
    await accountAdminApis.deleteAccountAppGrantToken(props.grantID, tokenID)
    if (createdToken.value?.id === tokenID) createdToken.value = null
    tokensQuery.refetch()
  },
  { en: 'Failed to revoke token', zh: '撤销 token 失败' },
  { en: 'Token revoked', zh: 'token 已撤销' }
).fn

function dismissCreatedToken() {
  createdToken.value = null
  resetCreateTokenForm()
}
</script>

<template>
  <section class="min-w-0">
    <RouterLink
      class="mb-4 inline-flex items-center gap-1 text-sm text-primary-main no-underline hover:underline"
      :to="`/admin/users/${encodeURIComponent(userID)}`"
    >
      <UIIcon class="h-3.5 w-3.5 rotate-180" type="arrowRightSmall" />
      {{ $t({ en: 'Back to user', zh: '返回用户详情' }) }}
    </RouterLink>

    <UIError v-if="!canManageAccount" class="py-12">
      {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
      <template #sub-message>
        {{
          $t({
            en: 'Managing Account app grants requires Account admin permission.',
            zh: '管理账号应用授权需要账号管理员权限。'
          })
        }}
      </template>
    </UIError>

    <UILoading v-else-if="grantQuery.isLoading.value || userQuery.isLoading.value" class="my-16" />
    <UIError v-else-if="grantQuery.error.value != null || userQuery.error.value != null" class="py-12">
      {{ $t((grantQuery.error.value ?? userQuery.error.value)!.userMessage) }}
    </UIError>

    <div v-else-if="grant != null && app != null" class="flex flex-col gap-5">
      <header class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-4">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary-200 text-xl font-semibold text-primary-main"
          >
            {{ appFallbackText }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-primary-main">
              {{ $t({ en: 'App authorization grant', zh: '应用授权关系' }) }}
            </div>
            <h2 class="m-0 mt-1 truncate text-xl font-semibold text-title">
              {{
                $t({
                  en: `${user?.displayName ?? `User ${userID}`} -> ${app.displayName}`,
                  zh: `${user?.displayName ?? `用户 ${userID}`} -> ${app.displayName}`
                })
              }}
            </h2>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-grey-700">
              <span class="flex items-center gap-1">
                <span>{{ $t({ en: 'Username', zh: '用户名' }) }}: {{ user?.username ?? '-' }}</span>
                <CopyButton
                  v-if="user != null"
                  :value="user.username"
                  :label="{ en: 'Copy username', zh: '复制用户名' }"
                />
              </span>
              <span class="flex items-center gap-1">
                <span>{{ $t({ en: 'App name', zh: '应用名称' }) }}: {{ app.name }}</span>
                <CopyButton :value="app.name" :label="{ en: 'Copy app name', zh: '复制应用名称' }" />
              </span>
              <span class="flex items-center gap-1">
                <span>{{ $t({ en: 'Client ID', zh: '客户端 ID' }) }}: {{ app.id }}</span>
                <CopyButton :value="app.id" :label="{ en: 'Copy client ID', zh: '复制客户端 ID' }" />
              </span>
            </div>
            <div class="mt-1 flex items-center gap-1 text-xs text-grey-700">
              <span class="flex items-center gap-1">
                <span>{{ $t({ en: 'Grant ID', zh: '授权 ID' }) }}: {{ grant.id }}</span>
                <CopyButton :value="grant.id" :label="{ en: 'Copy grant ID', zh: '复制授权 ID' }" />
              </span>
            </div>
          </div>
        </div>
        <UIButton
          v-radar="{
            name: $t({ en: 'Refresh grant details', zh: '刷新授权详情' }),
            desc: 'Reload app grant and token data'
          }"
          icon="reload"
          shape="square"
          type="white"
          :aria-label="$t({ en: 'Refresh grant details', zh: '刷新授权详情' })"
          @click="refetchAll"
        />
      </header>

      <div class="grid grid-cols-1 items-start gap-5 desktop:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div class="flex min-w-0 flex-col gap-5">
          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-5">
              <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Grant details', zh: '授权详情' }) }}</h3>
              <p class="m-0 mt-1 text-sm text-grey-800">
                {{
                  $t({
                    en: 'The active authorization this user granted to the OAuth app.',
                    zh: '此用户授予该 OAuth 应用的当前生效授权。'
                  })
                }}
              </p>
            </div>
            <div class="grid grid-cols-1 gap-4 text-sm tablet:grid-cols-2">
              <div>
                <div class="text-grey-800">{{ $t({ en: 'Scope', zh: '授权范围' }) }}</div>
                <div class="mt-1 flex items-center gap-1">
                  <code class="rounded bg-grey-200 px-2 py-1 font-mono text-xs text-title">{{ grant.scope }}</code>
                  <CopyButton :value="grant.scope" :label="{ en: 'Copy grant scope', zh: '复制授权范围' }" />
                </div>
              </div>
              <div>
                <div class="text-grey-800">{{ $t({ en: 'App status', zh: '应用状态' }) }}</div>
                <div class="mt-1">
                  <span
                    class="rounded px-2 py-1 text-xs font-medium"
                    :class="app.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-grey-300 text-grey-800'"
                  >
                    {{ $t(accountAppStatusLabels[app.status]) }}
                  </span>
                </div>
              </div>
              <div>
                <div class="text-grey-800">{{ $t({ en: 'Authorized', zh: '授权时间' }) }}</div>
                <div class="mt-1 text-grey-1000">{{ formatTime(grant.createdAt) }}</div>
              </div>
              <div>
                <div class="text-grey-800">{{ $t({ en: 'Last used', zh: '最后使用' }) }}</div>
                <div class="mt-1 text-grey-1000">
                  {{ grant.lastUsedAt == null ? '-' : formatTime(grant.lastUsedAt) }}
                </div>
              </div>
              <div>
                <div class="text-grey-800">{{ $t({ en: 'Last updated', zh: '最后更新' }) }}</div>
                <div class="mt-1 text-grey-1000">{{ formatTime(grant.updatedAt) }}</div>
              </div>
              <div>
                <div class="text-grey-800">{{ $t({ en: 'Client type', zh: '客户端类型' }) }}</div>
                <div class="mt-1 text-grey-1000">{{ $t(accountAppClientTypeLabels[app.clientType]) }}</div>
              </div>
            </div>
          </section>
        </div>

        <div class="flex min-w-0 flex-col gap-5">
          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-title">
                  {{ $t({ en: 'Create Access token', zh: '创建 Access token' }) }}
                </h3>
                <p class="m-0 mt-1 text-sm text-grey-800">
                  {{
                    $t({
                      en: 'Creates an Access token under this grant. The token value is shown only once.',
                      zh: '基于此授权创建 Access token。token 值只会展示一次。'
                    })
                  }}
                </p>
              </div>
              <UIButton
                v-if="createdToken == null"
                :icon="showCreateForm ? 'close' : 'plus'"
                :type="showCreateForm ? 'white' : 'primary'"
                size="small"
                @click="toggleCreateTokenForm"
              >
                {{ showCreateForm ? $t({ en: 'Cancel', zh: '取消' }) : $t({ en: 'Create', zh: '创建' }) }}
              </UIButton>
            </div>

            <form
              v-if="showCreateForm && createdToken == null"
              class="flex flex-col gap-4"
              @submit.prevent="handleCreateToken.fn"
            >
              <label class="flex flex-col gap-1 text-sm text-grey-900">
                {{ $t({ en: 'Name', zh: '名称' }) }}
                <UITextInput v-model:value="tokenName" :maxlength="accountAdminApis.accountAppTokenNameMaxLength" />
                <span class="text-xs text-grey-700">
                  {{
                    $t({
                      en: "Use a short name describing this token's purpose.",
                      zh: '用简短名称说明这个 token 的用途。'
                    })
                  }}
                </span>
              </label>

              <div class="rounded-md border border-grey-300 bg-grey-100 p-3">
                <label class="flex flex-col gap-1 text-sm text-grey-900">
                  {{ $t({ en: 'Expires at', zh: '过期时间' }) }}
                  <input
                    v-model="expiresAtInput"
                    class="box-border h-10 rounded border border-grey-400 bg-white px-3 text-sm text-title outline-none transition-colors focus:border-primary-main"
                    type="datetime-local"
                    :min="minExpiresAtInput"
                    :max="maxExpiresAtInput"
                  />
                </label>
                <div class="mt-3 flex items-center justify-between gap-3">
                  <span class="text-xs text-grey-700">
                    {{ $t({ en: 'Maximum lifetime: 365 days.', zh: '最长有效期：365 天。' }) }}
                  </span>
                  <div class="flex shrink-0 gap-2">
                    <UIButton type="white" size="small" @click="setTokenExpiration(183)">
                      {{ $t({ en: '6 months', zh: '6 个月' }) }}
                    </UIButton>
                    <UIButton type="white" size="small" @click="setTokenExpiration(365)">
                      {{ $t({ en: '1 year', zh: '1 年' }) }}
                    </UIButton>
                  </div>
                </div>
              </div>

              <UIButton
                html-type="submit"
                type="primary"
                :disabled="!isCreateTokenValid"
                :loading="handleCreateToken.isLoading.value"
              >
                {{ $t({ en: 'Create Access token', zh: '创建 Access token' }) }}
              </UIButton>
            </form>

            <div v-if="createdToken != null" class="mt-4 rounded-md border border-yellow-300 bg-yellow-100 p-4">
              <div class="font-medium text-title">
                {{ $t({ en: 'Copy this token now', zh: '请立即复制此 token' }) }}
              </div>
              <p class="m-0 mt-1 text-sm text-grey-900">
                {{
                  $t({
                    en: 'The token value will not be shown again after this message is closed.',
                    zh: '关闭此提示后将无法再次查看该 token 值。'
                  })
                }}
              </p>
              <pre class="mb-0 mt-3 overflow-auto rounded bg-white px-3 py-2 font-mono text-xs text-grey-1000">{{
                createdToken.value
              }}</pre>
              <div class="mt-3 flex flex-wrap justify-end gap-2">
                <UIButton
                  v-radar="{ name: 'Copy Access token', desc: 'Copy the newly created Access token to clipboard' }"
                  icon="copy"
                  type="white"
                  size="small"
                  :loading="handleCopyCreatedToken.isLoading.value"
                  @click="handleCopyCreatedToken.fn"
                >
                  {{ $t({ en: 'Copy token', zh: '复制 token' }) }}
                </UIButton>
                <UIButton type="primary" size="small" @click="dismissCreatedToken">
                  {{ $t({ en: 'I have saved it', zh: '我已保存' }) }}
                </UIButton>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section class="rounded-lg border border-grey-400 bg-white p-5">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="m-0 text-lg font-semibold text-title">
              {{ $t({ en: 'Active tokens', zh: '有效 token' }) }}
            </h3>
            <p class="m-0 mt-1 text-sm text-grey-800">
              {{
                $t({
                  en: `${tokensQuery.data.value?.total ?? 0} active tokens`,
                  zh: `共 ${tokensQuery.data.value?.total ?? 0} 个有效 token`
                })
              }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UISelect v-model:value="tokenTypeFilter" class="w-36">
              <UISelectOption value="all">{{ $t({ en: 'All tokens', zh: '全部 token' }) }}</UISelectOption>
              <UISelectOption value="accessToken">{{ $t(accountAppTokenTypeLabels.accessToken) }}</UISelectOption>
              <UISelectOption value="refreshToken">{{ $t(accountAppTokenTypeLabels.refreshToken) }}</UISelectOption>
            </UISelect>
            <UIButton icon="reload" type="white" size="small" @click="tokensQuery.refetch">
              {{ $t({ en: 'Refresh', zh: '刷新' }) }}
            </UIButton>
          </div>
        </div>

        <UILoading v-if="tokensQuery.isLoading.value" class="my-10" />
        <UIError v-else-if="tokensQuery.error.value != null" class="py-8">
          {{ $t(tokensQuery.error.value.userMessage) }}
        </UIError>
        <div v-else class="overflow-x-auto">
          <table v-if="(tokensQuery.data.value?.data.length ?? 0) > 0" class="w-full min-w-[1040px] text-left text-sm">
            <thead class="border-y border-grey-300 bg-grey-200 text-grey-800">
              <tr>
                <th class="px-4 py-3 font-medium">ID</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Type', zh: '类型' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Name', zh: '名称' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Created', zh: '创建时间' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Expires', zh: '过期时间' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Last used', zh: '最后使用' }) }}</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="token in tokensQuery.data.value?.data ?? []"
                :key="token.id"
                class="border-b border-grey-300 last:border-b-0"
              >
                <td class="px-4 py-3 font-mono text-xs text-grey-700">
                  <div class="flex items-center gap-1">
                    <span>{{ token.id }}</span>
                    <CopyButton :value="token.id" :label="{ en: 'Copy token ID', zh: '复制 token ID' }" />
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-grey-900">
                  {{ $t(accountAppTokenTypeLabels[token.tokenType]) }}
                </td>
                <td class="max-w-64 px-4 py-3 text-grey-900">
                  <span class="line-clamp-2">{{ token.name }}</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-grey-900">{{ formatTime(token.createdAt) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-grey-900">{{ formatTime(token.expiresAt) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-grey-900">
                  {{ token.lastUsedAt == null ? '-' : formatTime(token.lastUsedAt) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right">
                  <UIButton class="w-16" type="red" size="small" @click="handleRevokeToken(token.id)">
                    {{ $t({ en: 'Revoke', zh: '撤销' }) }}
                  </UIButton>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-8 text-center text-grey-800">
            {{ $t({ en: 'No active tokens', zh: '暂无有效 token' }) }}
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
