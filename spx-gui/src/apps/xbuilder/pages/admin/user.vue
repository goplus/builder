<script lang="ts">
import type { LocaleMessage } from '@/utils/i18n'
import type { AccountIdentityProviderName } from '@/apis/account/common'

const accountIdentityProviderLabels: Record<AccountIdentityProviderName, LocaleMessage> = {
  wechat: { en: 'WeChat', zh: '微信' },
  qq: { en: 'QQ', zh: 'QQ' },
  github: { en: 'GitHub', zh: 'GitHub' },
  apple: { en: 'Apple', zh: 'Apple' },
  google: { en: 'Google', zh: 'Google' },
  x: { en: 'X', zh: 'X' }
}

const accountAdminRoles = ['accountAdmin', 'authorizationAdmin', 'assetAdmin', 'courseAdmin'] as const

type AccountAdminRole = (typeof accountAdminRoles)[number]

const accountAdminRoleLabels: Record<AccountAdminRole, LocaleMessage> = {
  accountAdmin: { en: 'Account admin', zh: '账号管理员' },
  authorizationAdmin: { en: 'Authorization admin', zh: '授权管理员' },
  assetAdmin: { en: 'Asset admin', zh: '素材管理员' },
  courseAdmin: { en: 'Course admin', zh: '课程管理员' }
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { SortOrder } from '@/apis/common'
import { useSignedInStateQuery } from '@/stores/user'
import {
  UIButton,
  UICheckbox,
  UICheckboxGroup,
  UIError,
  UILoading,
  UIPagination,
  UIRadio,
  UIRadioGroup,
  UITextInput
} from '@/components/ui'
import CopyButton from '@/components/common/CopyButton.vue'
import UIIcon from '@/components/ui/icons/UIIcon.vue'
import * as accountAdminApis from '@/apis/admin/account'
import * as authorizationAdminApis from '@/apis/admin/authorization'
import { formatJSON, formatTime } from './common'

const props = defineProps<{
  userID: string
}>()

const i18n = useI18n()
const signedInStateQuery = useSignedInStateQuery()
const canManageAccount = computed(() => signedInStateQuery.data.value?.user?.capabilities.canManageAccount === true)
const canManageAuthorization = computed(
  () => signedInStateQuery.data.value?.user?.capabilities.canManageAuthorization === true
)

const userQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return null
    return accountAdminApis.getAccountUser(props.userID)
  },
  {
    en: 'Failed to load Account user',
    zh: '加载账号用户失败'
  }
)
const user = computed(() => userQuery.data.value)
const avatarFallbackText = computed(() => user.value?.displayName.trim().charAt(0).toUpperCase() || '?')
usePageTitle(() =>
  user.value == null
    ? { en: 'User', zh: '用户' }
    : [
        { en: user.value.displayName, zh: user.value.displayName },
        { en: 'User', zh: '用户' }
      ]
)

const displayName = ref('')
watch(
  user,
  (value) => {
    if (value != null) displayName.value = value.displayName
  },
  { immediate: true }
)
const isProfileChanged = computed(
  () => displayName.value.trim() !== '' && displayName.value.trim() !== user.value?.displayName
)

const password = ref('')

const identitiesQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return { total: 0, data: [] }
    return accountAdminApis.listAccountUserIdentities(props.userID, { pageIndex: 1, pageSize: 100 })
  },
  { en: 'Failed to load Account user identities', zh: '加载账号用户第三方身份失败' }
)

const sessionsQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return { total: 0, data: [] }
    return accountAdminApis.listAccountUserSessions(props.userID, { pageIndex: 1, pageSize: 100 })
  },
  { en: 'Failed to load Account user sessions', zh: '加载账号用户会话失败' }
)

const grantsPageSize = 20
const grantsPage = ref(1)
const grantsQuery = useQuery(
  async () => {
    if (!canManageAccount.value) return { total: 0, data: [] }
    return accountAdminApis.listAccountUserAppGrants(props.userID, {
      pageIndex: grantsPage.value,
      pageSize: grantsPageSize,
      orderBy: 'lastUsedAt',
      sortOrder: SortOrder.Desc
    })
  },
  { en: 'Failed to load Account user app grants', zh: '加载账号用户应用授权失败' }
)
const grantsPageTotal = computed(() => Math.ceil((grantsQuery.data.value?.total ?? 0) / grantsPageSize))

const authorizationQuery = useQuery(
  async () => {
    if (!canManageAuthorization.value) return null
    return authorizationAdminApis.getUserAuthorization(props.userID)
  },
  { en: 'Failed to load user authorization', zh: '加载用户授权失败' }
)

const roles = ref<AccountAdminRole[]>([])
const plan = ref<authorizationAdminApis.UserPlan>('free')
const unmanagedRoles = computed(
  () =>
    authorizationQuery.data.value?.roles.filter((role) => !accountAdminRoles.includes(role as AccountAdminRole)) ?? []
)
watch(
  () => authorizationQuery.data.value,
  (authorization) => {
    if (authorization == null) return
    roles.value = authorization.roles.filter((role): role is AccountAdminRole =>
      accountAdminRoles.includes(role as AccountAdminRole)
    )
    plan.value = authorization.plan
  },
  { immediate: true }
)

const planOptions = [
  {
    value: 'free',
    label: { en: 'Free', zh: '免费版' },
    description: { en: 'Standard XBuilder access.', zh: '使用 XBuilder 的标准能力。' }
  },
  {
    value: 'plus',
    label: { en: 'Plus', zh: 'Plus' },
    description: { en: 'Includes premium product capabilities.', zh: '包含高级产品能力。' }
  }
] as const

const accountAdminRoleDescriptions: Record<AccountAdminRole, { en: string; zh: string }> = {
  accountAdmin: {
    en: 'Manage Account users, apps, identities, and sessions.',
    zh: '管理账号用户、应用、第三方身份与会话。'
  },
  authorizationAdmin: {
    en: 'Manage user plans, roles, and authorization.',
    zh: '管理用户套餐、角色与授权配置。'
  },
  assetAdmin: {
    en: 'Manage the shared asset library.',
    zh: '管理公共素材库。'
  },
  courseAdmin: {
    en: 'Manage courses and course series.',
    zh: '管理课程与课程系列。'
  }
}

const capabilityLabels = {
  canManageAccount: { en: 'Manage Account', zh: '管理账号' },
  canManageAuthorization: { en: 'Manage authorization', zh: '管理授权' },
  canManageAssets: { en: 'Manage assets', zh: '管理素材' },
  canManageCourses: { en: 'Manage courses', zh: '管理课程' },
  canUsePremiumLLM: { en: 'Use premium AI models', zh: '使用高级 AI 模型' }
} as const

const capabilities = computed(() => {
  const values = authorizationQuery.data.value?.capabilities
  if (values == null) return []
  return Object.entries(capabilityLabels).map(([key, label]) => ({
    key,
    label,
    enabled: values[key as keyof typeof values]
  }))
})

const hasQuotaPolicies = computed(() => {
  const policies = authorizationQuery.data.value?.quotaPolicies
  return policies != null && Object.keys(policies).length > 0
})

const isAuthorizationChanged = computed(() => {
  const authorization = authorizationQuery.data.value
  if (authorization == null) return false
  const currentRoles = authorization.roles.filter((role): role is AccountAdminRole =>
    accountAdminRoles.includes(role as AccountAdminRole)
  )
  return (
    plan.value !== authorization.plan ||
    roles.value.some((role) => !currentRoles.includes(role)) ||
    currentRoles.some((role) => !roles.value.includes(role))
  )
})

function handlePlanChange(value: string | null) {
  if (value === 'free' || value === 'plus') plan.value = value
}

function handleRolesChange(value: string[]) {
  roles.value = value.filter((role): role is AccountAdminRole => accountAdminRoles.includes(role as AccountAdminRole))
}

function refetchAll() {
  userQuery.refetch()
  identitiesQuery.refetch()
  sessionsQuery.refetch()
  grantsQuery.refetch()
  authorizationQuery.refetch()
}

const handleUpdateUser = useMessageHandle(
  async () => {
    await accountAdminApis.updateAccountUser(props.userID, { displayName: displayName.value.trim() })
    userQuery.refetch()
  },
  { en: 'Failed to update Account user', zh: '更新账号用户失败' },
  { en: 'Account user updated', zh: '账号用户已更新' }
)

async function handleAvatarFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (file == null) return
  await handleUpdateAvatar.fn(file)
  ;(event.target as HTMLInputElement).value = ''
}

function hideBrokenImage(event: Event) {
  ;(event.currentTarget as HTMLImageElement).style.display = 'none'
}

const handleUpdateAvatar = useMessageHandle(
  async (file: File) => {
    await accountAdminApis.updateAccountUserAvatar(props.userID, file)
    userQuery.refetch()
  },
  { en: 'Failed to update Account user avatar', zh: '更新账号用户头像失败' },
  { en: 'Avatar updated', zh: '头像已更新' }
)

const handleSetPassword = useMessageHandle(
  async () => {
    await accountAdminApis.setAccountUserPassword(props.userID, { password: password.value })
    password.value = ''
  },
  { en: 'Failed to set Account user password', zh: '设置账号用户密码失败' },
  { en: 'Password updated', zh: '密码已更新' }
)

const handleDeletePassword = useMessageHandle(
  async () => {
    if (!window.confirm(i18n.t({ en: 'Delete managed password?', zh: '删除托管密码？' }))) return
    await accountAdminApis.deleteAccountUserPassword(props.userID)
  },
  { en: 'Failed to delete Account user password', zh: '删除账号用户密码失败' },
  { en: 'Password deleted', zh: '密码已删除' }
)

const handleUpdateAuthorization = useMessageHandle(
  async () => {
    await authorizationAdminApis.updateUserAuthorization(props.userID, {
      roles: [...unmanagedRoles.value, ...roles.value],
      plan: plan.value
    })
    authorizationQuery.refetch()
  },
  { en: 'Failed to update user authorization', zh: '更新用户授权失败' },
  { en: 'Authorization updated', zh: '授权已更新' }
)

const handleDeleteIdentity = useMessageHandle(
  async (identityID: string) => {
    await accountAdminApis.deleteAccountUserIdentity(props.userID, identityID)
    identitiesQuery.refetch()
  },
  { en: 'Failed to unlink identity', zh: '解绑第三方身份失败' },
  { en: 'Identity unlinked', zh: '第三方身份已解绑' }
)

function deleteIdentity(identityID: string) {
  if (!window.confirm(i18n.t({ en: 'Unlink this identity?', zh: '解绑此第三方身份？' }))) return
  handleDeleteIdentity.fn(identityID)
}

const handleDeleteSession = useMessageHandle(
  async (sessionID: string) => {
    await accountAdminApis.deleteAccountSession(sessionID)
    sessionsQuery.refetch()
  },
  { en: 'Failed to delete session', zh: '删除会话失败' },
  { en: 'Session deleted', zh: '会话已删除' }
)

function deleteSession(sessionID: string) {
  if (!window.confirm(i18n.t({ en: 'Delete this session?', zh: '删除此会话？' }))) return
  handleDeleteSession.fn(sessionID)
}

const handleDeleteAllSessions = useMessageHandle(
  async () => {
    await accountAdminApis.deleteAccountUserSessions(props.userID)
    sessionsQuery.refetch()
  },
  { en: 'Failed to delete sessions', zh: '删除会话失败' },
  { en: 'Sessions deleted', zh: '会话已删除' }
)

function deleteAllSessions() {
  if (!window.confirm(i18n.t({ en: 'Delete all sessions for this user?', zh: '删除此用户的全部会话？' }))) return
  handleDeleteAllSessions.fn()
}
</script>

<template>
  <section class="min-w-0">
    <RouterLink
      class="mb-4 inline-flex items-center gap-1 text-sm text-primary-main no-underline hover:underline"
      to="/admin/users"
    >
      <UIIcon class="h-3.5 w-3.5 rotate-180" type="arrowRightSmall" />
      {{ $t({ en: 'Back to users', zh: '返回用户列表' }) }}
    </RouterLink>

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

    <UILoading v-else-if="userQuery.isLoading.value" class="my-16" />
    <UIError v-else-if="userQuery.error.value != null" class="py-12">
      {{ $t(userQuery.error.value.userMessage) }}
    </UIError>

    <div v-else-if="user != null" class="flex flex-col gap-5">
      <header class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-4">
          <div
            class="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-200 text-xl font-semibold text-primary-main"
          >
            {{ avatarFallbackText }}
            <img
              :src="user.avatar"
              :alt="user.displayName"
              crossorigin="anonymous"
              class="absolute inset-0 h-full w-full object-cover"
              @error="hideBrokenImage"
            />
          </div>
          <div class="min-w-0">
            <h2 class="m-0 truncate text-xl font-semibold text-title">{{ user.displayName }}</h2>
            <div class="mt-0.5 flex min-w-0 items-center gap-1 text-sm text-grey-800">
              <span class="truncate">@{{ user.username }}</span>
              <CopyButton :value="user.username" :label="{ en: 'Copy username', zh: '复制用户名' }" />
            </div>
            <div class="mt-1 flex items-center gap-1 font-mono text-xs text-grey-700">
              <span>ID {{ user.id }}</span>
              <CopyButton :value="user.id" :label="{ en: 'Copy user ID', zh: '复制用户 ID' }" />
            </div>
          </div>
        </div>
        <UIButton
          v-radar="{
            name: $t({ en: 'Refresh user details', zh: '刷新用户详情' }),
            desc: 'Reload all user administration data'
          }"
          icon="reload"
          shape="square"
          type="white"
          :aria-label="$t({ en: 'Refresh user details', zh: '刷新用户详情' })"
          @click="refetchAll"
        />
      </header>

      <div class="grid grid-cols-1 items-start gap-5 desktop:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div class="flex min-w-0 flex-col gap-5">
          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-5">
              <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Account profile', zh: '账号资料' }) }}</h3>
              <p class="m-0 mt-1 text-sm text-grey-800">
                {{ $t({ en: 'Basic identity shown across XBuilder.', zh: '在 XBuilder 各处展示的基础身份信息。' }) }}
              </p>
            </div>
            <div class="grid grid-cols-1 gap-6 tablet:grid-cols-[144px_minmax(0,1fr)]">
              <div class="w-36 justify-self-center flex flex-col items-center gap-3 rounded-md bg-grey-200 p-4">
                <div
                  class="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary-200 text-3xl font-semibold text-primary-main"
                >
                  {{ avatarFallbackText }}
                  <img
                    :src="user.avatar"
                    :alt="user.displayName"
                    crossorigin="anonymous"
                    class="absolute inset-0 h-full w-full object-cover"
                    @error="hideBrokenImage"
                  />
                </div>
                <label
                  class="cursor-pointer text-sm font-medium text-primary-main hover:underline"
                  :class="handleUpdateAvatar.isLoading.value ? 'pointer-events-none opacity-60' : null"
                >
                  {{
                    handleUpdateAvatar.isLoading.value
                      ? $t({ en: 'Uploading...', zh: '上传中...' })
                      : $t({ en: 'Change avatar', zh: '更换头像' })
                  }}
                  <input class="hidden" type="file" accept="image/png,image/jpeg" @change="handleAvatarFile" />
                </label>
                <div class="text-center text-xs text-grey-700">PNG / JPG, ≤ 5 MB</div>
              </div>
              <form class="flex min-w-0 flex-col gap-5" @submit.prevent="handleUpdateUser.fn">
                <div class="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                  <div class="text-sm">
                    <div class="text-grey-800">{{ $t({ en: 'Username', zh: '用户名' }) }}</div>
                    <div class="mt-1 font-medium text-title">{{ user.username }}</div>
                    <div class="mt-1 text-xs text-grey-700">
                      {{ $t({ en: 'Username cannot be changed.', zh: '用户名不可修改。' }) }}
                    </div>
                  </div>
                  <label class="flex flex-col gap-1 text-sm text-grey-900">
                    {{ $t({ en: 'Display name', zh: '显示名称' }) }}
                    <UITextInput v-model:value="displayName" />
                  </label>
                </div>
                <div class="grid grid-cols-1 gap-4 border-t border-grey-300 pt-4 text-sm tablet:grid-cols-2">
                  <div>
                    <div class="text-grey-800">{{ $t({ en: 'Created', zh: '创建时间' }) }}</div>
                    <div class="mt-1 text-grey-1000">{{ formatTime(user.createdAt) }}</div>
                  </div>
                  <div>
                    <div class="text-grey-800">{{ $t({ en: 'Last updated', zh: '最后更新' }) }}</div>
                    <div class="mt-1 text-grey-1000">{{ formatTime(user.updatedAt) }}</div>
                  </div>
                </div>
                <div class="flex justify-end">
                  <UIButton
                    html-type="submit"
                    type="primary"
                    :disabled="!isProfileChanged"
                    :loading="handleUpdateUser.isLoading.value"
                  >
                    {{ $t({ en: 'Save changes', zh: '保存修改' }) }}
                  </UIButton>
                </div>
              </form>
            </div>
          </section>

          <section v-if="canManageAuthorization" class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Authorization', zh: '授权配置' }) }}</h3>
                <p class="m-0 mt-1 text-sm text-grey-800">
                  {{ $t({ en: 'Control the plan and administrative access.', zh: '配置用户套餐与管理权限。' }) }}
                </p>
              </div>
              <UIButton icon="reload" type="white" size="small" @click="authorizationQuery.refetch">
                {{ $t({ en: 'Refresh', zh: '刷新' }) }}
              </UIButton>
            </div>
            <UILoading v-if="authorizationQuery.isLoading.value" class="my-10" />
            <UIError v-else-if="authorizationQuery.error.value != null" class="py-8">
              {{ $t(authorizationQuery.error.value.userMessage) }}
            </UIError>
            <form v-else class="flex flex-col gap-6" @submit.prevent="handleUpdateAuthorization.fn">
              <fieldset class="m-0 border-0 p-0">
                <legend class="mb-2 text-sm font-medium text-grey-900">{{ $t({ en: 'Plan', zh: '套餐' }) }}</legend>
                <UIRadioGroup
                  :value="plan"
                  class="grid grid-cols-1 gap-3 tablet:grid-cols-2"
                  @update:value="handlePlanChange"
                >
                  <UIRadio
                    v-for="option in planOptions"
                    :key="option.value"
                    :value="option.value"
                    class="rounded-md border border-grey-400 p-3 has-[:checked]:border-primary-main has-[:checked]:bg-primary-100"
                  >
                    <span class="flex flex-col gap-1">
                      <span class="font-medium text-title">{{ $t(option.label) }}</span>
                      <span class="text-xs text-grey-700">{{ $t(option.description) }}</span>
                    </span>
                  </UIRadio>
                </UIRadioGroup>
              </fieldset>

              <fieldset class="m-0 border-0 p-0">
                <legend class="mb-2 text-sm font-medium text-grey-900">
                  {{ $t({ en: 'Admin roles', zh: '管理员角色' }) }}
                </legend>
                <UICheckboxGroup
                  :value="roles"
                  class="grid grid-cols-1 gap-3 tablet:grid-cols-2"
                  @update:value="handleRolesChange"
                >
                  <UICheckbox
                    v-for="role in accountAdminRoles"
                    :key="role"
                    :value="role"
                    class="items-start rounded-md border border-grey-400 p-3 has-[:checked]:border-primary-main has-[:checked]:bg-primary-100"
                  >
                    <span class="flex flex-col gap-1">
                      <span class="font-medium text-title">{{ $t(accountAdminRoleLabels[role]) }}</span>
                      <span class="text-xs text-grey-700">{{ $t(accountAdminRoleDescriptions[role]) }}</span>
                    </span>
                  </UICheckbox>
                </UICheckboxGroup>
                <div v-if="unmanagedRoles.length > 0" class="mt-3 text-sm">
                  <div class="text-grey-800">{{ $t({ en: 'Other assigned roles', zh: '其他已分配角色' }) }}</div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <span
                      v-for="role in unmanagedRoles"
                      :key="role"
                      class="rounded bg-grey-300 px-2 py-1 font-mono text-xs text-grey-900"
                    >
                      {{ role }}
                    </span>
                  </div>
                  <p class="m-0 mt-2 text-xs text-grey-700">
                    {{
                      $t({
                        en: 'These roles are not managed by this interface and will be preserved when saving.',
                        zh: '这些角色不由当前界面管理，保存时会原样保留。'
                      })
                    }}
                  </p>
                </div>
              </fieldset>

              <div v-if="authorizationQuery.data.value != null" class="border-t border-grey-300 pt-5">
                <h4 class="m-0 text-sm font-medium text-grey-900">
                  {{ $t({ en: 'Effective capabilities', zh: '当前生效能力' }) }}
                </h4>
                <div class="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 tablet:grid-cols-2">
                  <div
                    v-for="capability in capabilities"
                    :key="capability.key"
                    class="flex items-center justify-between gap-3 text-sm"
                  >
                    <span class="text-grey-900">{{ $t(capability.label) }}</span>
                    <span
                      class="rounded px-2 py-0.5 text-xs font-medium"
                      :class="capability.enabled ? 'bg-green-100 text-green-600' : 'bg-grey-300 text-grey-700'"
                    >
                      {{ capability.enabled ? $t({ en: 'Enabled', zh: '已启用' }) : $t({ en: 'Off', zh: '未启用' }) }}
                    </span>
                  </div>
                </div>
                <details v-if="hasQuotaPolicies" class="mt-4 rounded-md bg-grey-200 p-3">
                  <summary class="cursor-pointer text-sm font-medium text-grey-900">
                    <span class="inline-flex items-center gap-1">
                      <span>{{ $t({ en: 'View effective quota policies', zh: '查看生效的配额策略' }) }}</span>
                      <CopyButton
                        :value="formatJSON(authorizationQuery.data.value.quotaPolicies)"
                        :label="{ en: 'Copy quota policies', zh: '复制配额策略' }"
                      />
                    </span>
                  </summary>
                  <pre class="mb-0 mt-3 max-h-56 overflow-auto text-xs text-grey-1000">{{
                    formatJSON(authorizationQuery.data.value.quotaPolicies)
                  }}</pre>
                </details>
                <p v-else class="m-0 mt-3 text-xs text-grey-700">
                  {{ $t({ en: 'No additional quota policies are active.', zh: '当前没有额外生效的配额策略。' }) }}
                </p>
              </div>

              <div class="flex justify-end">
                <UIButton
                  html-type="submit"
                  type="primary"
                  :disabled="!isAuthorizationChanged"
                  :loading="handleUpdateAuthorization.isLoading.value"
                >
                  {{ $t({ en: 'Save authorization', zh: '保存授权配置' }) }}
                </UIButton>
              </div>
            </form>
          </section>
        </div>

        <div class="flex min-w-0 flex-col gap-5">
          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-4">
              <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Managed password', zh: '托管密码' }) }}</h3>
              <p class="m-0 mt-1 text-sm text-grey-800">
                {{
                  $t({
                    en: 'Set or replace the password used for username sign-in.',
                    zh: '设置或替换用户通过用户名登录时使用的密码。'
                  })
                }}
              </p>
            </div>
            <form class="flex flex-col gap-3" @submit.prevent="handleSetPassword.fn">
              <label class="flex flex-col gap-1 text-sm text-grey-900">
                {{ $t({ en: 'New password', zh: '新密码' }) }}
                <UITextInput v-model:value="password" type="password" />
              </label>
              <UIButton
                html-type="submit"
                type="primary"
                :disabled="password === ''"
                :loading="handleSetPassword.isLoading.value"
              >
                {{ $t({ en: 'Set new password', zh: '设置新密码' }) }}
              </UIButton>
            </form>
            <div class="mt-5 border-t border-grey-300 pt-4">
              <div class="text-sm font-medium text-title">
                {{ $t({ en: 'Remove password sign-in', zh: '停用密码登录' }) }}
              </div>
              <p class="m-0 mt-1 text-xs text-grey-700">
                {{
                  $t({
                    en: 'The user may still sign in through linked identity providers.',
                    zh: '用户仍可通过已绑定的第三方身份登录。'
                  })
                }}
              </p>
              <UIButton
                class="mt-3"
                type="red"
                size="small"
                :loading="handleDeletePassword.isLoading.value"
                @click="handleDeletePassword.fn"
              >
                {{ $t({ en: 'Delete managed password', zh: '删除托管密码' }) }}
              </UIButton>
            </div>
          </section>

          <section class="rounded-lg border border-grey-400 bg-white p-5">
            <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-title">
                  {{ $t({ en: 'Linked identities', zh: '第三方身份' }) }}
                </h3>
                <p class="m-0 mt-1 text-sm text-grey-800">
                  {{
                    $t({
                      en: `${identitiesQuery.data.value?.total ?? 0} linked identities`,
                      zh: `已绑定 ${identitiesQuery.data.value?.total ?? 0} 个身份`
                    })
                  }}
                </p>
              </div>
              <UIButton icon="reload" type="white" size="small" @click="identitiesQuery.refetch">
                {{ $t({ en: 'Refresh', zh: '刷新' }) }}
              </UIButton>
            </div>
            <UILoading v-if="identitiesQuery.isLoading.value" class="my-10" />
            <UIError v-else-if="identitiesQuery.error.value != null" class="py-8">
              {{ $t(identitiesQuery.error.value.userMessage) }}
            </UIError>
            <div v-else class="flex flex-col divide-y divide-grey-300">
              <div
                v-for="identity in identitiesQuery.data.value?.data ?? []"
                :key="identity.id"
                class="flex items-start justify-between gap-3 py-3"
              >
                <div class="min-w-0 text-sm">
                  <div class="font-medium text-title">{{ $t(accountIdentityProviderLabels[identity.provider]) }}</div>
                  <div v-if="identity.displayName != null" class="mt-0.5 text-grey-900">{{ identity.displayName }}</div>
                  <div class="mt-1 flex items-start gap-1 font-mono text-xs text-grey-700">
                    <span class="break-all">{{ identity.subject }}</span>
                    <CopyButton
                      :value="identity.subject"
                      :label="{ en: 'Copy provider subject', zh: '复制第三方身份标识' }"
                    />
                  </div>
                  <div
                    v-if="identity.subjectNamespace != null"
                    class="mt-1 flex items-center gap-1 text-xs text-grey-700"
                  >
                    <span>{{ $t({ en: 'Namespace', zh: '命名空间' }) }}: {{ identity.subjectNamespace }}</span>
                    <CopyButton
                      :value="identity.subjectNamespace"
                      :label="{ en: 'Copy subject namespace', zh: '复制身份命名空间' }"
                    />
                  </div>
                  <div class="mt-1 flex items-center gap-1 font-mono text-xs text-grey-700">
                    <span>ID {{ identity.id }}</span>
                    <CopyButton :value="identity.id" :label="{ en: 'Copy identity ID', zh: '复制第三方身份 ID' }" />
                  </div>
                  <div class="mt-1 text-xs text-grey-700">
                    {{ $t({ en: 'Linked', zh: '绑定时间' }) }}: {{ formatTime(identity.createdAt) }}
                  </div>
                </div>
                <UIButton type="red" size="small" @click="deleteIdentity(identity.id)">
                  {{ $t({ en: 'Unlink', zh: '解绑' }) }}
                </UIButton>
              </div>
              <div v-if="(identitiesQuery.data.value?.data.length ?? 0) === 0" class="py-8 text-center text-grey-800">
                {{ $t({ en: 'No linked identities', zh: '暂无第三方身份' }) }}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section class="rounded-lg border border-grey-400 bg-white p-5">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="m-0 text-lg font-semibold text-title">
              {{ $t({ en: 'Authorized apps', zh: '已授权应用' }) }}
            </h3>
            <p class="m-0 mt-1 text-sm text-grey-800">
              {{
                $t({
                  en: `${grantsQuery.data.value?.total ?? 0} active app grants`,
                  zh: `共 ${grantsQuery.data.value?.total ?? 0} 个生效应用授权`
                })
              }}
            </p>
          </div>
          <UIButton icon="reload" type="white" size="small" @click="grantsQuery.refetch">
            {{ $t({ en: 'Refresh', zh: '刷新' }) }}
          </UIButton>
        </div>
        <UILoading v-if="grantsQuery.isLoading.value" class="my-10" />
        <UIError v-else-if="grantsQuery.error.value != null" class="py-8">
          {{ $t(grantsQuery.error.value.userMessage) }}
        </UIError>
        <div v-else class="overflow-x-auto">
          <table v-if="(grantsQuery.data.value?.data.length ?? 0) > 0" class="w-full min-w-[780px] text-left text-sm">
            <thead class="border-y border-grey-300 bg-grey-200 text-grey-800">
              <tr>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'App', zh: '应用' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Scope', zh: '授权范围' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Last used', zh: '最后使用' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Authorized', zh: '授权时间' }) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="grant in grantsQuery.data.value?.data ?? []"
                :key="grant.id"
                class="border-b border-grey-300 last:border-b-0"
              >
                <td class="px-4 py-3">
                  <RouterLink
                    class="font-medium text-title no-underline hover:text-primary-main hover:underline"
                    :to="`/admin/users/${encodeURIComponent(user.id)}/app-grants/${encodeURIComponent(grant.id)}`"
                  >
                    {{ grant.app.displayName }}
                  </RouterLink>
                  <div class="font-mono text-xs text-grey-800">{{ grant.app.name }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1">
                    <code class="rounded bg-grey-200 px-2 py-1 font-mono text-xs text-title">{{ grant.scope }}</code>
                    <CopyButton :value="grant.scope" :label="{ en: 'Copy grant scope', zh: '复制授权范围' }" />
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-grey-900">
                  {{ grant.lastUsedAt == null ? '-' : formatTime(grant.lastUsedAt) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-grey-900">{{ formatTime(grant.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-8 text-center text-grey-800">
            {{ $t({ en: 'No active app grants', zh: '暂无生效应用授权' }) }}
          </div>
          <UIPagination
            v-show="grantsPageTotal > 1"
            v-model:current="grantsPage"
            class="mt-5 justify-center"
            :total="grantsPageTotal"
          />
        </div>
      </section>

      <section class="rounded-lg border border-grey-400 bg-white p-5">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Active sessions', zh: '活跃会话' }) }}</h3>
            <p class="m-0 mt-1 text-sm text-grey-800">
              {{
                $t({
                  en: `${sessionsQuery.data.value?.total ?? 0} browser sessions`,
                  zh: `共 ${sessionsQuery.data.value?.total ?? 0} 个浏览器会话`
                })
              }}
            </p>
          </div>
          <div class="flex gap-2">
            <UIButton icon="reload" type="white" size="small" @click="sessionsQuery.refetch">
              {{ $t({ en: 'Refresh', zh: '刷新' }) }}
            </UIButton>
            <UIButton
              type="red"
              size="small"
              :disabled="(sessionsQuery.data.value?.data.length ?? 0) === 0"
              @click="deleteAllSessions"
            >
              {{ $t({ en: 'Delete all sessions', zh: '删除全部会话' }) }}
            </UIButton>
          </div>
        </div>
        <UILoading v-if="sessionsQuery.isLoading.value" class="my-10" />
        <UIError v-else-if="sessionsQuery.error.value != null" class="py-8">
          {{ $t(sessionsQuery.error.value.userMessage) }}
        </UIError>
        <div v-else class="overflow-x-auto">
          <table v-if="(sessionsQuery.data.value?.data.length ?? 0) > 0" class="w-full min-w-[920px] text-left text-sm">
            <thead class="border-y border-grey-300 bg-grey-200 text-grey-800">
              <tr>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Session ID', zh: '会话 ID' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'IP address', zh: 'IP 地址' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'User agent', zh: '浏览器 / 设备' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Last used', zh: '最后使用' }) }}</th>
                <th class="px-4 py-3 font-medium">{{ $t({ en: 'Expires', zh: '过期时间' }) }}</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="session in sessionsQuery.data.value?.data ?? []"
                :key="session.id"
                class="border-b border-grey-300 last:border-b-0"
              >
                <td class="px-4 py-3 font-mono text-xs text-grey-700">
                  <div class="flex items-center gap-1">
                    <span>{{ session.id }}</span>
                    <CopyButton :value="session.id" :label="{ en: 'Copy session ID', zh: '复制会话 ID' }" />
                  </div>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-title">
                  <div class="flex items-center gap-1">
                    <span>{{ session.ipAddress ?? '-' }}</span>
                    <CopyButton
                      v-if="session.ipAddress != null"
                      :value="session.ipAddress"
                      :label="{ en: 'Copy IP address', zh: '复制 IP 地址' }"
                    />
                  </div>
                </td>
                <td class="max-w-96 px-4 py-3 text-grey-900">
                  <div class="flex items-start gap-1">
                    <div class="line-clamp-2">{{ session.userAgent ?? '-' }}</div>
                    <CopyButton
                      v-if="session.userAgent != null"
                      :value="session.userAgent"
                      :label="{ en: 'Copy user agent', zh: '复制浏览器 / 设备信息' }"
                    />
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-grey-900">{{ formatTime(session.lastUsedAt) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-grey-900">{{ formatTime(session.expiresAt) }}</td>
                <td class="px-4 py-3 text-right">
                  <UIButton type="red" size="small" @click="deleteSession(session.id)">
                    {{ $t({ en: 'Delete', zh: '删除' }) }}
                  </UIButton>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-8 text-center text-grey-800">
            {{ $t({ en: 'No active sessions', zh: '暂无活跃会话' }) }}
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
