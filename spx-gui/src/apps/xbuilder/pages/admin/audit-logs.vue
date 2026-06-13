<template>
  <section class="min-w-0">
    <div class="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 class="m-0 text-xl font-semibold text-title">{{ $t({ en: 'Audit logs', zh: '审计日志' }) }}</h2>
        <p class="m-0 mt-1 text-sm text-grey-800">
          {{ $t({ en: 'Review admin operations.', zh: '查看管理员操作记录。' }) }}
        </p>
      </div>
      <UIButton icon="reload" type="white" @click="auditLogsQuery.refetch">
        {{ $t({ en: 'Refresh', zh: '刷新' }) }}
      </UIButton>
    </div>

    <div class="overflow-hidden rounded-lg border border-grey-400 bg-white">
      <div
        class="grid grid-cols-1 gap-3 border-b border-grey-300 bg-grey-100 px-5 py-4 tablet:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_128px_auto]"
      >
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Created after', zh: '开始时间' }) }}
          <input
            v-model="createdAfter"
            class="h-8 rounded-md border border-grey-400 bg-white px-2 text-grey-1000 outline-none focus:border-primary-500"
            type="datetime-local"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Created before', zh: '结束时间' }) }}
          <input
            v-model="createdBefore"
            class="h-8 rounded-md border border-grey-400 bg-white px-2 text-grey-1000 outline-none focus:border-primary-500"
            type="datetime-local"
          />
        </label>
        <UISelect v-model:value="sortOrder" class="w-full self-end">
          <UISelectOption value="desc">{{ $t({ en: 'Newest', zh: '最新' }) }}</UISelectOption>
          <UISelectOption value="asc">{{ $t({ en: 'Oldest', zh: '最早' }) }}</UISelectOption>
        </UISelect>
        <UIButton
          type="white"
          class="self-end"
          :disabled="createdAfter === '' && createdBefore === ''"
          @click="clearFilters"
        >
          {{ $t({ en: 'Clear', zh: '清空' }) }}
        </UIButton>
      </div>

      <UILoading v-if="auditLogsQuery.isLoading.value" class="my-16" />
      <UIError v-else-if="auditLogsQuery.error.value != null" class="py-12">
        {{ $t(auditLogsQuery.error.value.userMessage) }}
      </UIError>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead class="bg-grey-200 text-grey-800">
            <tr class="border-b border-grey-300">
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'Time', zh: '时间' }) }}</th>
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'Actor', zh: '操作者' }) }}</th>
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'Action', zh: '操作' }) }}</th>
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'Resource', zh: '资源' }) }}</th>
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'Metadata', zh: '元数据' }) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in auditLogsQuery.data.value?.data ?? []"
              :key="log.id"
              class="border-b border-grey-200 align-top transition-colors last:border-b-0 hover:bg-grey-100"
            >
              <td class="px-5 py-3 whitespace-nowrap">{{ formatTime(log.createdAt) }}</td>
              <td class="px-5 py-3">{{ log.actor ?? '-' }}</td>
              <td class="px-5 py-3">
                <span class="rounded bg-primary-100 px-2 py-1 font-mono text-xs text-primary-main">{{
                  log.action
                }}</span>
              </td>
              <td class="px-5 py-3">
                <div>{{ log.resourceType }}</div>
                <div class="font-mono text-xs text-grey-700">{{ log.resourceID }}</div>
              </td>
              <td class="px-5 py-3">
                <details v-if="hasMetadata(log.metadata)" class="group max-w-80">
                  <summary class="cursor-pointer select-none text-sm font-medium text-primary-main">
                    {{ $t({ en: 'View details', zh: '查看详情' }) }}
                  </summary>
                  <pre class="mt-2 max-h-48 overflow-auto rounded bg-grey-200 p-3 text-xs text-grey-1000">{{
                    formatJSON(log.metadata)
                  }}</pre>
                </details>
                <span v-else class="text-grey-700">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-5 py-4 flex justify-center">
        <UIPagination v-show="pageTotal > 1" v-model:current="page" :total="pageTotal" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useQuery } from '@/utils/query'
import { UIButton, UIError, UILoading, UIPagination, UISelect, UISelectOption } from '@/components/ui'
import * as auditApis from '@/apis/admin/audit'
import { formatJSON, formatTime } from './common'

const pageSize = 20
const page = ref(1)
const sortOrder = ref<'asc' | 'desc'>('desc')
const createdAfter = ref('')
const createdBefore = ref('')

watch([sortOrder, createdAfter, createdBefore], () => {
  page.value = 1
})

function clearFilters() {
  createdAfter.value = ''
  createdBefore.value = ''
}

function hasMetadata(value: unknown) {
  return value != null && typeof value === 'object' && Object.keys(value).length > 0
}

function toISOString(value: string) {
  if (value === '') return undefined
  return new Date(value).toISOString()
}

const auditLogsQuery = useQuery(
  async () =>
    auditApis.listAuditLogs({
      pageIndex: page.value,
      pageSize,
      orderBy: 'createdAt',
      sortOrder: sortOrder.value,
      createdAfter: toISOString(createdAfter.value),
      createdBefore: toISOString(createdBefore.value)
    }),
  { en: 'Failed to load audit logs', zh: '加载审计日志失败' }
)

const pageTotal = computed(() => Math.ceil((auditLogsQuery.data.value?.total ?? 0) / pageSize))
</script>
