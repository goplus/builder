<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { useSignedIn } from '@/stores/user'
import { UIButton, UIError, UILoading, UISwitch, UITextInput } from '@/components/ui'
import CopyButton from '@/components/common/CopyButton.vue'
import * as accountAdminApis from '@/apis/admin/account'
import OAuthClients from './OAuthClients.vue'
import { accountAppOnlyScopesTip, accountAppStatusLabels, formatTime } from './common'

const props = defineProps<{
  appID: string
}>()

const signedIn = useSignedIn()
const canManageAccount = computed(() => signedIn.user?.capabilities.canManageAccount === true)

const appQuery = useQuery(async () => (canManageAccount.value ? accountAdminApis.getAccountApp(props.appID) : null), {
  en: 'Failed to load Account app',
  zh: '加载账号应用失败'
})
const app = computed(() => appQuery.data.value)
usePageTitle(() => ({ en: app.value?.displayName ?? 'Account app', zh: app.value?.displayName ?? '账号应用' }))

const displayName = ref('')
const description = ref('')
const active = ref(true)
const readApps = ref(false)
const readUsers = ref(false)
const reason = ref('')
watch(
  app,
  (value, previous) => {
    if (value == null) return
    if (previous == null || displayName.value === previous.displayName) displayName.value = value.displayName
    if (previous == null || description.value === (previous.description ?? '')) {
      description.value = value.description ?? ''
    }
    if (previous == null || active.value === (previous.status === 'active')) active.value = value.status === 'active'
    if (previous == null || readApps.value === previous.clientCredentialsScopes.includes('account:app:read')) {
      readApps.value = value.clientCredentialsScopes.includes('account:app:read')
    }
    if (previous == null || readUsers.value === previous.clientCredentialsScopes.includes('account:user:read')) {
      readUsers.value = value.clientCredentialsScopes.includes('account:user:read')
    }
  },
  { immediate: true }
)

const patch = computed<accountAdminApis.UpdateAccountAppParams>(() => {
  const current = app.value
  if (current == null) return {}
  const changes: accountAdminApis.UpdateAccountAppParams = {}
  if (displayName.value.trim() !== current.displayName) changes.displayName = displayName.value.trim()
  if (description.value !== (current.description ?? '')) changes.description = description.value || null
  const status = active.value ? 'active' : 'disabled'
  if (status !== current.status) changes.status = status
  const scopes: accountAdminApis.AccountAppOnlyScope[] = []
  if (readApps.value) scopes.push('account:app:read')
  if (readUsers.value) scopes.push('account:user:read')
  if (
    scopes.length !== current.clientCredentialsScopes.length ||
    scopes.some((scope) => !current.clientCredentialsScopes.includes(scope))
  ) {
    changes.clientCredentialsScopes = scopes
  }
  return changes
})
const hasChanges = computed(() => Object.keys(patch.value).length > 0)
const scopesChanged = computed(() => patch.value.clientCredentialsScopes != null)

const handleSave = useMessageHandle(
  async () => {
    const updated = await accountAdminApis.updateAccountApp(props.appID, {
      ...patch.value,
      ...(reason.value.trim() === '' ? {} : { reason: reason.value.trim() })
    })
    appQuery.data.value = updated
    displayName.value = updated.displayName
    description.value = updated.description ?? ''
    active.value = updated.status === 'active'
    readApps.value = updated.clientCredentialsScopes.includes('account:app:read')
    readUsers.value = updated.clientCredentialsScopes.includes('account:user:read')
    reason.value = ''
  },
  { en: 'Failed to update app', zh: '更新应用失败' },
  { en: 'App updated', zh: '应用已更新' }
)

const handleUpload = useMessageHandle(
  async (file: File) => {
    await accountAdminApis.updateAccountAppAvatar(props.appID, file)
    appQuery.refetch()
  },
  { en: 'Failed to upload app avatar', zh: '上传应用头像失败' },
  { en: 'App avatar updated', zh: '应用头像已更新' }
)

function uploadAvatar(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const file = event.target.files?.[0]
  if (file != null) handleUpload.fn(file)
  event.target.value = ''
}
</script>

<template>
  <section class="min-w-0">
    <RouterLink class="mb-4 inline-block text-sm text-primary-main" to="/admin/apps">
      {{ $t({ en: 'Back to apps', zh: '返回应用列表' }) }}
    </RouterLink>
    <UIError v-if="!canManageAccount" class="py-12">{{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}</UIError>
    <UILoading v-else-if="appQuery.isLoading.value" class="my-12" />
    <UIError v-else-if="appQuery.error.value != null" class="py-12">{{ $t(appQuery.error.value.userMessage) }}</UIError>
    <template v-else-if="app != null">
      <div class="mb-5 rounded-lg border border-grey-400 bg-white p-5">
        <div class="mb-5 flex items-center gap-4">
          <img v-if="app.avatar != null" :src="app.avatar" :alt="app.displayName" class="h-16 w-16 rounded-lg" />
          <div>
            <h2 class="m-0 text-xl font-semibold text-title">{{ app.displayName }}</h2>
            <div class="flex items-center gap-2 text-sm text-grey-800">
              <span>{{ app.name }}</span>
              <span>ID {{ app.id }}</span>
              <CopyButton :value="app.id" :label="{ en: 'Copy app ID', zh: '复制应用 ID' }" />
            </div>
            <div class="mt-1 flex gap-2 text-xs text-grey-700">
              <span>{{ formatTime(app.updatedAt) }}</span>
              <span>{{ $t(accountAppStatusLabels[app.status]) }}</span>
            </div>
          </div>
          <UIButton
            v-radar="{ name: 'refresh-app-details', desc: 'Reload app registration and permissions' }"
            class="ml-auto"
            type="white"
            icon="reload"
            @click="appQuery.refetch"
          >
            {{ $t({ en: 'Refresh', zh: '刷新' }) }}
          </UIButton>
        </div>
        <form class="flex flex-col gap-4" @submit.prevent="handleSave.fn">
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Display name', zh: '显示名称' }) }}
            <UITextInput
              v-model:value="displayName"
              required
              :maxlength="accountAdminApis.accountAppDisplayNameMaxLength"
            />
          </label>
          <label class="flex flex-col gap-1 text-sm text-grey-900">
            {{ $t({ en: 'Description', zh: '说明' }) }}
            <UITextInput v-model:value="description" type="textarea" :rows="3" :maxlength="200" />
          </label>
          <label class="flex items-center gap-2 text-sm text-grey-900">
            <UISwitch
              v-radar="{ name: 'app-availability', desc: 'Enable or disable this app' }"
              :value="active"
              @update:value="active = $event"
            />
            {{ $t({ en: 'App enabled', zh: '启用应用' }) }}
          </label>
          <p class="m-0 text-xs text-grey-700">
            {{
              $t({
                en: 'Disabling the app revokes its outstanding authorization flows and all tokens. Re-enabling it does not restore them.',
                zh: '停用应用会使其未完成的授权流程和全部令牌失效，重新启用不会恢复这些记录。'
              })
            }}
          </p>
          <div class="flex flex-col gap-3">
            <h3 class="m-0 text-base font-semibold text-title">
              {{ $t({ en: 'App-only access', zh: '应用自主访问' }) }}
            </h3>
            <label class="flex items-center gap-2 text-sm text-grey-900">
              <UISwitch v-model:value="readApps" />
              account:app:read
            </label>
            <label class="flex items-center gap-2 text-sm text-grey-900">
              <UISwitch v-model:value="readUsers" />
              account:user:read
            </label>
            <p class="m-0 text-xs text-grey-700">{{ $t(accountAppOnlyScopesTip) }}</p>
            <label class="flex flex-col gap-1 text-sm text-grey-900">
              {{ $t({ en: 'Reason for permission change', zh: '权限变更说明' }) }}
              <UITextInput v-model:value="reason" :maxlength="500" :required="scopesChanged" />
            </label>
          </div>
          <div class="flex justify-end">
            <UIButton
              html-type="submit"
              :disabled="!hasChanges || displayName.trim() === '' || (scopesChanged && reason.trim() === '')"
              :loading="handleSave.isLoading.value"
            >
              {{ $t({ en: 'Save', zh: '保存' }) }}
            </UIButton>
          </div>
        </form>
        <label class="mt-4 flex flex-col gap-2 text-sm text-grey-900">
          {{ $t({ en: 'App avatar', zh: '应用头像' }) }}
          <input
            type="file"
            accept="image/png,image/jpeg"
            :disabled="handleUpload.isLoading.value"
            @change="uploadAvatar"
          />
        </label>
      </div>
      <OAuthClients :key="app.id" :app-i-d="app.id" />
    </template>
  </section>
</template>
