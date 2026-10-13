<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { useQuery } from '@/utils/query'
import { useRouteQueryParamInt, useRouteQueryParamStrEnum } from '@/utils/route'
import { usePageTitle } from '@/utils/utils'
import { useSignedInStateQuery } from '@/stores/user'
import { SortOrder } from '@/apis/common'
import { FeedbackStatus } from '@/apis/feedback'
import { UIButton, UIError, UILoading, UIPagination, UISelect, UISelectOption } from '@/components/ui'
import * as feedbackAdminApis from '@/apis/admin/feedback'
import { feedbackStatusLabels, formatTime } from './common'

const statusFilters = { New: FeedbackStatus.New, Handled: FeedbackStatus.Handled, All: 'all' } as const

const pageSize = 20
const page = useRouteQueryParamInt('p', 1)
const resetPage = (query: Partial<Record<string, string | null>>) => ({ ...query, p: null })
const statusFilter = useRouteQueryParamStrEnum('status', statusFilters, statusFilters.New, resetPage)
const sortOrder = useRouteQueryParamStrEnum('order', SortOrder, SortOrder.Desc, resetPage)

const signedInStateQuery = useSignedInStateQuery()
const canManageFeedback = computed(() => signedInStateQuery.data.value?.user?.capabilities.canManageFeedback === true)

const feedbackQuery = useQuery(
  async () => {
    if (!canManageFeedback.value) return { total: 0, data: [] }
    return feedbackAdminApis.listFeedback({
      status: statusFilter.value === statusFilters.All ? undefined : statusFilter.value,
      pageIndex: page.value,
      pageSize,
      orderBy: 'createdAt',
      sortOrder: sortOrder.value
    })
  },
  { en: 'Failed to load feedback', zh: '加载反馈失败' }
)

const pageTotal = computed(() => Math.ceil((feedbackQuery.data.value?.total ?? 0) / pageSize))

usePageTitle({ en: 'Feedback', zh: '用户反馈' })
</script>

<template>
  <section class="min-w-0">
    <div class="mb-5">
      <h2 class="m-0 text-xl font-semibold text-title">{{ $t({ en: 'Feedback', zh: '用户反馈' }) }}</h2>
      <p class="m-0 mt-1 text-sm text-grey-800">
        {{ $t({ en: 'Review problems reported by users.', zh: '查看用户反馈的问题。' }) }}
      </p>
    </div>

    <UIError v-if="!canManageFeedback" class="py-12">
      {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
      <template #sub-message>
        {{
          $t({ en: 'Managing feedback requires feedback admin permission.', zh: '管理用户反馈需要反馈管理员权限。' })
        }}
      </template>
    </UIError>

    <div v-else class="overflow-hidden rounded-lg border border-grey-400 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-grey-300 bg-grey-100 px-5 py-3">
        <div class="text-sm text-grey-800">
          {{
            $t({
              en: `${feedbackQuery.data.value?.total ?? 0} feedback items`,
              zh: `共 ${feedbackQuery.data.value?.total ?? 0} 条反馈`
            })
          }}
        </div>
        <div class="flex items-center gap-2">
          <UISelect v-model:value="statusFilter" class="w-32">
            <UISelectOption :value="statusFilters.New">
              {{ $t(feedbackStatusLabels[FeedbackStatus.New]) }}
            </UISelectOption>
            <UISelectOption :value="statusFilters.Handled">
              {{ $t(feedbackStatusLabels[FeedbackStatus.Handled]) }}
            </UISelectOption>
            <UISelectOption :value="statusFilters.All">{{ $t({ en: 'All', zh: '全部' }) }}</UISelectOption>
          </UISelect>
          <UISelect v-model:value="sortOrder" class="w-32">
            <UISelectOption value="desc">{{ $t({ en: 'Newest', zh: '最新' }) }}</UISelectOption>
            <UISelectOption value="asc">{{ $t({ en: 'Oldest', zh: '最早' }) }}</UISelectOption>
          </UISelect>
          <UIButton icon="reload" type="white" @click="feedbackQuery.refetch">
            {{ $t({ en: 'Refresh', zh: '刷新' }) }}
          </UIButton>
        </div>
      </div>
      <UILoading v-if="feedbackQuery.isLoading.value" class="my-16" />
      <UIError v-else-if="feedbackQuery.error.value != null" class="py-12">
        {{ $t(feedbackQuery.error.value.userMessage) }}
      </UIError>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-full border-collapse text-left text-sm tablet:min-w-[760px]">
          <thead class="bg-grey-200 text-grey-800">
            <tr class="border-b border-grey-300">
              <th class="w-1/2 px-5 py-3 font-medium">{{ $t({ en: 'Title', zh: '标题' }) }}</th>
              <th class="hidden px-5 py-3 font-medium tablet:table-cell">
                {{ $t({ en: 'Submitted by', zh: '提交者' }) }}
              </th>
              <th class="px-5 py-3 font-medium">{{ $t({ en: 'Status', zh: '状态' }) }}</th>
              <th class="hidden px-5 py-3 font-medium tablet:table-cell">
                {{ $t({ en: 'Submitted', zh: '提交时间' }) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="feedback in feedbackQuery.data.value?.data ?? []"
              :key="feedback.id"
              class="border-b border-grey-200 transition-colors last:border-b-0 hover:bg-grey-100"
            >
              <td class="max-w-0 px-5 py-3">
                <RouterLink
                  class="block truncate font-medium text-title no-underline hover:text-primary-main hover:underline"
                  :to="`/admin/feedback/${encodeURIComponent(feedback.id)}`"
                >
                  {{ feedback.title }}
                </RouterLink>
              </td>
              <td class="hidden px-5 py-3 tablet:table-cell">{{ feedback.owner }}</td>
              <td class="px-5 py-3">
                <span
                  class="inline-flex whitespace-nowrap rounded px-2 py-1 text-xs font-medium"
                  :class="
                    feedback.status === FeedbackStatus.New
                      ? 'bg-primary-100 text-primary-main'
                      : 'bg-grey-300 text-grey-800'
                  "
                >
                  {{ $t(feedbackStatusLabels[feedback.status]) }}
                </span>
              </td>
              <td class="hidden whitespace-nowrap px-5 py-3 tablet:table-cell">{{ formatTime(feedback.createdAt) }}</td>
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
