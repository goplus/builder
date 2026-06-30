<script setup lang="ts">
import saveAs from 'file-saver'
import { computed, ref, watch } from 'vue'

import { Exception, capture } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { UIButton, UIError, UIIcon, UILoading, UIModal, UIModalClose } from '@/components/ui'
import * as accountAdminApis from '@/apis/admin/account'
import { parseAccountUserImportCsv, type AccountUserImportError, type AccountUserImportRow } from './csv'

type ImportStatus = 'pending' | 'creating' | 'created' | 'failed'

type ImportRowState = AccountUserImportRow & {
  status: ImportStatus
  error: string | null
}

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  resolved: [void]
  cancelled: []
}>()

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const rows = ref<ImportRowState[]>([])
const isCreating = ref(false)

const parseResultQuery = useQuery(
  async () => {
    if (selectedFile.value == null) return null
    const text = await selectedFile.value.text()
    return parseAccountUserImportCsv(text)
  },
  { en: 'Failed to read CSV file', zh: '读取 CSV 文件失败' }
)

const fileName = computed(() => selectedFile.value?.name ?? '')
const hasSelectedFile = computed(() => selectedFile.value != null)
const parseErrors = computed(() => parseResultQuery.data.value?.errors ?? [])
const validRows = computed(() => rows.value.length > 0 && parseErrors.value.length === 0)
const createdCount = computed(() => rows.value.filter((row) => row.status === 'created').length)
const failedRows = computed(() => rows.value.filter((row) => row.status === 'failed'))
const pendingRows = computed(() => rows.value.filter((row) => row.status === 'pending'))
const canCreate = computed(() => validRows.value && !isCreating.value && pendingRows.value.length > 0)
const canRetry = computed(() => validRows.value && !isCreating.value && failedRows.value.length > 0)

watch(
  () => parseResultQuery.data.value,
  (result) => {
    rows.value = result?.rows.map((row) => ({ ...row, status: 'pending', error: null })) ?? []
  }
)

function chooseFile() {
  fileInputRef.value?.click()
}

function downloadExampleCsv() {
  const csv = 'username,displayName,password\nsample-user,Sample User,YOUR_PASSWORD_HERE\n'
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'account-users-example.csv')
}

function handleFileChange(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (file == null) return
  selectedFile.value = file
}

async function createRows(targetRows: ImportRowState[]) {
  if (isCreating.value) return
  isCreating.value = true
  try {
    for (const row of targetRows) {
      row.status = 'creating'
      row.error = null
      try {
        await accountAdminApis.createAccountUser({
          username: row.username,
          displayName: row.displayName,
          password: row.password
        })
        row.status = 'created'
      } catch (e) {
        row.status = 'failed'
        row.error = getErrorMessage(e)
        capture(e)
      }
    }
  } finally {
    isCreating.value = false
  }
}

function handleCreate() {
  void createRows(pendingRows.value)
}

function handleRetryFailed() {
  void createRows(failedRows.value)
}

function handleClose() {
  if (isCreating.value) return
  emit('cancelled')
}

function handleDone() {
  emit('resolved')
}

function getErrorMessage(e: unknown) {
  if (e instanceof Exception && e.userMessage != null) return t(e.userMessage)
  if (e instanceof Error) return e.message
  return String(e)
}

function formatImportError(error: AccountUserImportError) {
  if (error.line == null) return error.message
  return {
    en: `Line ${error.line}: ${error.message.en}`,
    zh: `第 ${error.line} 行：${error.message.zh}`
  }
}
</script>

<template>
  <UIModal
    :radar="{ name: 'Account user import modal', desc: 'Modal for importing Account users from CSV' }"
    style="width: 900px; max-height: calc(100vh - 32px)"
    :visible="visible"
    :mask-closable="!isCreating"
    @update:visible="handleClose"
  >
    <header class="h-14 flex items-center justify-between border-b border-grey-400 px-6">
      <h2 class="m-0 text-xl font-semibold text-title">{{ $t({ en: 'Import users', zh: '导入用户' }) }}</h2>
      <UIModalClose @click="handleClose" />
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <section class="rounded-lg border border-grey-400 bg-grey-100 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="font-medium text-title">{{ fileName || $t({ en: 'CSV file', zh: 'CSV 文件' }) }}</div>
            <div class="mt-1 text-sm text-grey-800">
              {{
                $t({
                  en: 'Required columns: username, password. displayName is optional and defaults to username.',
                  zh: '必需列：username、password；displayName 可选，留空则使用 username。'
                })
              }}
              <button
                v-if="!hasSelectedFile"
                type="button"
                class="cursor-pointer border-none bg-transparent p-0 text-primary-main underline hover:text-primary-600"
                @click="downloadExampleCsv"
              >
                {{ $t({ en: 'Download example CSV', zh: '下载示例 CSV' }) }}
              </button>
            </div>
          </div>
          <input
            ref="fileInputRef"
            class="hidden"
            type="file"
            accept=".csv,text/csv"
            :disabled="isCreating"
            @change="handleFileChange"
          />
          <UIButton type="white" icon="file" :disabled="isCreating" @click="chooseFile">
            {{ $t({ en: 'Choose file', zh: '选择文件' }) }}
          </UIButton>
        </div>
      </section>

      <UILoading v-if="parseResultQuery.isLoading.value" class="my-12" />

      <UIError v-else-if="parseResultQuery.error.value != null" class="py-10">
        {{ $t(parseResultQuery.error.value.userMessage) }}
      </UIError>

      <UIError v-else-if="parseErrors.length > 0" class="py-10">
        {{ $t({ en: 'CSV validation failed', zh: 'CSV 校验失败' }) }}
        <template #sub-message>
          <div class="mt-3 space-y-1 text-left">
            <div v-for="(error, index) in parseErrors" :key="index">
              {{ $t(formatImportError(error)) }}
            </div>
          </div>
        </template>
      </UIError>

      <div v-else-if="rows.length > 0" class="mt-5 overflow-hidden rounded-lg border border-grey-400 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-grey-300 bg-grey-100 px-5 py-3">
          <div class="text-sm text-grey-800">
            {{
              $t({
                en: `${rows.length} users, ${createdCount} created, ${failedRows.length} failed`,
                zh: `共 ${rows.length} 位用户，已创建 ${createdCount} 位，失败 ${failedRows.length} 位`
              })
            }}
          </div>
        </div>
        <div class="max-h-[420px] overflow-auto">
          <table class="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead class="sticky top-0 bg-grey-200 text-grey-800">
              <tr class="border-b border-grey-300">
                <th class="px-5 py-3 font-medium">{{ $t({ en: 'Line', zh: '行' }) }}</th>
                <th class="px-5 py-3 font-medium">{{ $t({ en: 'Username', zh: '用户名' }) }}</th>
                <th class="px-5 py-3 font-medium">{{ $t({ en: 'Display name', zh: '显示名称' }) }}</th>
                <th class="px-5 py-3 font-medium">{{ $t({ en: 'Status', zh: '状态' }) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.line" class="border-b border-grey-200 last:border-b-0">
                <td class="px-5 py-3 font-mono text-xs text-grey-800">{{ row.line }}</td>
                <td class="px-5 py-3">{{ row.username }}</td>
                <td class="px-5 py-3">{{ row.displayName }}</td>
                <td class="px-5 py-3">
                  <div class="flex items-start gap-2">
                    <UIIcon
                      v-if="row.status === 'creating'"
                      class="mt-0.5 h-4 w-4 shrink-0 text-primary-main"
                      type="loading"
                    />
                    <UIIcon
                      v-else-if="row.status === 'created'"
                      class="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                      type="success"
                    />
                    <UIIcon
                      v-else-if="row.status === 'failed'"
                      class="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                      type="error"
                    />
                    <span>
                      <template v-if="row.status === 'pending'">{{ $t({ en: 'Pending', zh: '待创建' }) }}</template>
                      <template v-else-if="row.status === 'creating'">{{
                        $t({ en: 'Creating', zh: '创建中' })
                      }}</template>
                      <template v-else-if="row.status === 'created'">{{
                        $t({ en: 'Created', zh: '已创建' })
                      }}</template>
                      <template v-else>
                        {{ row.error ?? $t({ en: 'Failed', zh: '失败' }) }}
                      </template>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <footer class="flex items-center justify-end gap-3 border-t border-grey-400 px-6 py-4">
      <UIButton type="white" :disabled="isCreating" @click="handleClose">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton v-if="canRetry" type="primary" icon="reload" :loading="isCreating" @click="handleRetryFailed">
        {{ $t({ en: 'Retry failed', zh: '重试失败项' }) }}
      </UIButton>
      <UIButton v-else-if="canCreate" type="primary" :loading="isCreating" @click="handleCreate">
        {{ $t({ en: 'Create users', zh: '创建用户' }) }}
      </UIButton>
      <UIButton
        v-else-if="validRows && pendingRows.length === 0"
        type="primary"
        :disabled="isCreating"
        @click="handleDone"
      >
        {{ $t({ en: 'Done', zh: '完成' }) }}
      </UIButton>
    </footer>
  </UIModal>
</template>
