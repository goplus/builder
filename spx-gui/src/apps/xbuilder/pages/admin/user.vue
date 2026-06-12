<template>
  <section class="min-w-0">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <RouterLink class="text-sm text-primary-main no-underline" to="/admin/users">
          {{ $t({ en: 'Back to users', zh: '返回用户列表' }) }}
        </RouterLink>
        <h2 class="m-0 mt-2 text-xl font-semibold text-title">{{ $t({ en: 'User details', zh: '用户详情' }) }}</h2>
      </div>
      <UIButton type="secondary" @click="refetchAll">{{ $t({ en: 'Refresh', zh: '刷新' }) }}</UIButton>
    </div>

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
      <section class="rounded-lg bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Profile', zh: '资料' }) }}</h3>
          <div class="text-xs text-grey-700">{{ user.id }}</div>
        </div>
        <div class="grid grid-cols-[160px_minmax(0,1fr)] gap-6">
          <div class="flex flex-col items-center gap-3">
            <img :src="user.avatar" class="h-24 w-24 rounded-full bg-grey-300 object-cover" />
            <label class="cursor-pointer text-sm text-primary-main">
              {{ $t({ en: 'Upload avatar', zh: '上传头像' }) }}
              <input class="hidden" type="file" accept="image/*" @change="handleAvatarFile" />
            </label>
          </div>
          <form class="grid grid-cols-2 gap-4" @submit.prevent="handleUpdateUser.fn">
            <label class="flex flex-col gap-1 text-sm text-grey-900">
              {{ $t({ en: 'Username', zh: '用户名' }) }}
              <UITextInput :value="user.username" readonly />
            </label>
            <label class="flex flex-col gap-1 text-sm text-grey-900">
              {{ $t({ en: 'Display name', zh: '显示名称' }) }}
              <UITextInput v-model:value="displayName" />
            </label>
            <div class="text-sm text-grey-800">
              <div>{{ $t({ en: 'Created', zh: '创建时间' }) }}</div>
              <div class="mt-1 text-grey-1000">{{ formatTime(user.createdAt) }}</div>
            </div>
            <div class="text-sm text-grey-800">
              <div>{{ $t({ en: 'Updated', zh: '更新时间' }) }}</div>
              <div class="mt-1 text-grey-1000">{{ formatTime(user.updatedAt) }}</div>
            </div>
            <div class="col-span-2 flex justify-end">
              <UIButton html-type="submit" type="primary" :loading="handleUpdateUser.isLoading.value">
                {{ $t({ en: 'Save profile', zh: '保存资料' }) }}
              </UIButton>
            </div>
          </form>
        </div>
      </section>

      <section class="rounded-lg bg-white p-5 shadow-sm">
        <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Managed password', zh: '托管密码' }) }}</h3>
        <form class="mt-4 flex items-end gap-3" @submit.prevent="handleSetPassword.fn">
          <label class="min-w-0 flex-1 flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'New password', zh: '新密码' }) }}
            <UITextInput v-model:value="password" type="password" />
          </label>
          <UIButton html-type="submit" type="primary" :loading="handleSetPassword.isLoading.value">
            {{ $t({ en: 'Set password', zh: '设置密码' }) }}
          </UIButton>
          <UIButton type="red" :loading="handleDeletePassword.isLoading.value" @click="handleDeletePassword.fn">
            {{ $t({ en: 'Delete password', zh: '删除密码' }) }}
          </UIButton>
        </form>
      </section>

      <section v-if="canManageAuthorization" class="rounded-lg bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Authorization', zh: '授权' }) }}</h3>
          <UIButton type="secondary" size="small" @click="authorizationQuery.refetch">
            {{ $t({ en: 'Refresh', zh: '刷新' }) }}
          </UIButton>
        </div>
        <UILoading v-if="authorizationQuery.isLoading.value" class="my-10" />
        <UIError v-else-if="authorizationQuery.error.value != null" class="py-8">
          {{ $t(authorizationQuery.error.value.userMessage) }}
        </UIError>
        <form v-else class="flex flex-col gap-4" @submit.prevent="handleUpdateAuthorization.fn">
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Plan', zh: '套餐' }) }}
            <UISelect v-model:value="plan" class="w-44">
              <UISelectOption value="free">free</UISelectOption>
              <UISelectOption value="plus">plus</UISelectOption>
            </UISelect>
          </label>
          <div class="flex flex-col gap-2 text-sm text-grey-900">
            {{ $t({ en: 'Roles', zh: '角色' }) }}
            <label v-for="role in accountAdminRoles" :key="role" class="flex items-center gap-2">
              <input v-model="roles" type="checkbox" :value="role" />
              {{ $t(accountAdminRoleLabels[role]) }}
              <span class="font-mono text-xs text-grey-700">{{ role }}</span>
            </label>
          </div>
          <div v-if="authorizationQuery.data.value != null" class="grid grid-cols-2 gap-4">
            <pre class="overflow-auto rounded-md bg-grey-200 p-3 text-xs text-grey-1000">{{
              formatJSON(authorizationQuery.data.value.capabilities)
            }}</pre>
            <pre class="overflow-auto rounded-md bg-grey-200 p-3 text-xs text-grey-1000">{{
              formatJSON(authorizationQuery.data.value.quotaPolicies ?? {})
            }}</pre>
          </div>
          <div class="flex justify-end">
            <UIButton html-type="submit" type="primary" :loading="handleUpdateAuthorization.isLoading.value">
              {{ $t({ en: 'Save authorization', zh: '保存授权' }) }}
            </UIButton>
          </div>
        </form>
      </section>

      <section class="grid grid-cols-2 gap-5">
        <div class="rounded-lg bg-white p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Identities', zh: '第三方身份' }) }}</h3>
            <UIButton type="secondary" size="small" @click="identitiesQuery.refetch">
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
              class="py-3 flex items-center justify-between gap-3"
            >
              <div class="min-w-0">
                <div class="font-medium text-title">{{ identity.provider }}</div>
                <div class="truncate font-mono text-xs text-grey-800">{{ identity.subject }}</div>
                <div v-if="identity.displayName != null" class="text-sm text-grey-800">{{ identity.displayName }}</div>
              </div>
              <UIButton type="red" size="small" @click="deleteIdentity(identity.id)">
                {{ $t({ en: 'Unlink', zh: '解绑' }) }}
              </UIButton>
            </div>
            <div v-if="(identitiesQuery.data.value?.data.length ?? 0) === 0" class="py-8 text-center text-grey-800">
              {{ $t({ en: 'No identities', zh: '暂无第三方身份' }) }}
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Sessions', zh: '会话' }) }}</h3>
            <div class="flex gap-2">
              <UIButton type="secondary" size="small" @click="sessionsQuery.refetch">
                {{ $t({ en: 'Refresh', zh: '刷新' }) }}
              </UIButton>
              <UIButton type="red" size="small" @click="deleteAllSessions">
                {{ $t({ en: 'Delete all', zh: '全部删除' }) }}
              </UIButton>
            </div>
          </div>
          <UILoading v-if="sessionsQuery.isLoading.value" class="my-10" />
          <UIError v-else-if="sessionsQuery.error.value != null" class="py-8">
            {{ $t(sessionsQuery.error.value.userMessage) }}
          </UIError>
          <div v-else class="flex flex-col divide-y divide-grey-300">
            <div
              v-for="session in sessionsQuery.data.value?.data ?? []"
              :key="session.id"
              class="py-3 flex items-start justify-between gap-3"
            >
              <div class="min-w-0 text-sm">
                <div class="font-medium text-title">{{ session.ipAddress ?? '-' }}</div>
                <div class="truncate text-grey-800">{{ session.userAgent ?? '-' }}</div>
                <div class="mt-1 text-xs text-grey-700">
                  {{ $t({ en: 'Last used', zh: '最后使用' }) }}: {{ formatTime(session.lastUsedAt) }}
                </div>
                <div class="text-xs text-grey-700">
                  {{ $t({ en: 'Expires', zh: '过期时间' }) }}: {{ formatTime(session.expiresAt) }}
                </div>
              </div>
              <UIButton type="red" size="small" @click="deleteSession(session.id)">
                {{ $t({ en: 'Delete', zh: '删除' }) }}
              </UIButton>
            </div>
            <div v-if="(sessionsQuery.data.value?.data.length ?? 0) === 0" class="py-8 text-center text-grey-800">
              {{ $t({ en: 'No sessions', zh: '暂无会话' }) }}
            </div>
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
import * as authorizationAdminApis from '@/apis/admin/authorization'
import { accountAdminRoleLabels, accountAdminRoles, formatJSON, formatTime, type AccountAdminRole } from './common'

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

const displayName = ref('')
watch(
  user,
  (value) => {
    if (value != null) displayName.value = value.displayName
  },
  { immediate: true }
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

const authorizationQuery = useQuery(
  async () => {
    if (!canManageAuthorization.value) return null
    return authorizationAdminApis.getUserAuthorization(props.userID)
  },
  { en: 'Failed to load user authorization', zh: '加载用户授权失败' }
)

const roles = ref<AccountAdminRole[]>([])
const plan = ref<authorizationAdminApis.UserPlan>('free')
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

function refetchAll() {
  userQuery.refetch()
  identitiesQuery.refetch()
  sessionsQuery.refetch()
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
      roles: roles.value,
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
