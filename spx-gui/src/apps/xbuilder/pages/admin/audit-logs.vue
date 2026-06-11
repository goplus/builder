<template>
  <section class="min-w-0">
    <div class="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 class="m-0 text-xl font-semibold text-title">{{ $t({ en: 'Audit logs', zh: '审计日志' }) }}</h2>
        <p class="m-0 mt-1 text-sm text-grey-800">
          {{ $t({ en: 'Review admin operations.', zh: '查看管理员操作记录。' }) }}
        </p>
      </div>
      <UIButton type="secondary" @click="auditLogsQuery.refetch">
        {{ $t({ en: 'Refresh', zh: '刷新' }) }}
      </UIButton>
    </div>

    <div class="rounded-lg bg-white shadow-sm">
      <div class="border-b border-grey-300 px-5 py-3 flex items-end gap-3">
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Created after', zh: '开始时间' }) }}
          <input v-model="createdAfter" class="h-8 rounded-md border border-grey-400 px-2" type="datetime-local" />
        </label>
        <label class="flex flex-col gap-1 text-sm text-grey-900">
          {{ $t({ en: 'Created before', zh: '结束时间' }) }}
          <input v-model="createdBefore" class="h-8 rounded-md border border-grey-400 px-2" type="datetime-local" />
        </label>
        <UISelect v-model:value="sortOrder" class="w-32">
          <UISelectOption value="desc">{{ $t({ en: 'Newest', zh: '最新' }) }}</UISelectOption>
          <UISelectOption value="asc">{{ $t({ en: 'Oldest', zh: '最早' }) }}</UISelectOption>
        </UISelect>
      </div>

      <UILoading v-if="auditLogsQuery.isLoading.value" class="my-16" />
      <UIError v-else-if="auditLogsQuery.error.value != null" class="py-12">
        {{ $t(auditLogsQuery.error.value.userMessage) }}
      </UIError>
      <table v-else class="w-full border-collapse text-left text-sm">
        <thead class="text-grey-800">
          <tr class="border-b border-grey-300">
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'Time', zh: '时间' }) }}</th>
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'Actor', zh: '操作者' }) }}</th>
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'Action', zh: '操作' }) }}</th>
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'Resource', zh: '资源' }) }}</th>
            <th class="px-5 py-3 font-medium">{{ $t({ en: 'Metadata', zh: '元数据' }) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in auditLogsQuery.data.value?.data ?? []" :key="log.id" class="border-b border-grey-200">
            <td class="px-5 py-3 whitespace-nowrap">{{ formatTime(log.createdAt) }}</td>
            <td class="px-5 py-3">{{ log.actor ?? '-' }}</td>
            <td class="px-5 py-3 font-mono text-xs">{{ log.action }}</td>
            <td class="px-5 py-3">
              <div>{{ log.resourceType }}</div>
              <div class="font-mono text-xs text-grey-700">{{ log.resourceID }}</div>
            </td>
            <td class="px-5 py-3">
              <pre class="max-h-32 max-w-80 overflow-auto rounded bg-grey-200 p-2 text-xs">{{
                formatJSON(log.metadata ?? {})
              }}</pre>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="px-5 py-4 flex justify-center">
        <UIPagination v-show="pageTotal > 1" v-model:current="page" :total="pageTotal" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { useQuery } from '@/utils/query'
import { UIButton, UIError, UILoading, UIPagination, UISelect, UISelectOption } from '@/components/ui'
import * as auditApis from '@/apis/admin/audit'
import { formatJSON, formatTime } from './common'

const pageSize = 20
const page = ref(1)
const sortOrder = ref<'asc' | 'desc'>('desc')
const createdAfter = ref('')
const createdBefore = ref('')

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
