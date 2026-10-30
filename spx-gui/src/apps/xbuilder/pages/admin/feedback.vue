<script lang="ts">
import dayjs from 'dayjs'

import type { LocaleMessage } from '@/utils/i18n'
import type { FeedbackSource } from '@/components/feedback/context'

const feedbackSourceLabels: Record<FeedbackSource, LocaleMessage> = {
  profileMenu: { en: 'Profile menu', zh: '用户菜单' }
}

function formatOutputTime(value: string) {
  return dayjs(value).format('HH:mm:ss.SSS')
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { useSignedInStateQuery } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { FeedbackStatus } from '@/apis/feedback'
import { UIButton, UIError, UIIcon, UILoading } from '@/components/ui'
import { RuntimeOutputKind } from '@/components/editor/runtime'
import { DiagnosticSeverity } from '@/components/editor/spx-code-editor'
import { feedbackContextSchema } from '@/components/feedback/context'
import * as feedbackAdminApis from '@/apis/admin/feedback'
import { feedbackStatusLabels, formatJSON, formatTime } from './common'

const props = defineProps<{
  feedbackID: string
}>()

const signedInStateQuery = useSignedInStateQuery()
const canManageFeedback = computed(() => signedInStateQuery.data.value?.user?.capabilities.canManageFeedback === true)

const feedbackQuery = useQuery(
  async () => {
    if (!canManageFeedback.value) return null
    return feedbackAdminApis.getFeedback(props.feedbackID)
  },
  { en: 'Failed to load feedback', zh: '加载反馈失败' }
)
const feedback = computed(() => feedbackQuery.data.value)
const rawContext = computed(() => feedback.value?.context ?? null)
const context = computed(() => {
  if (rawContext.value == null) return null
  const result = feedbackContextSchema.safeParse(rawContext.value)
  return result.success ? result.data : null
})

usePageTitle(() =>
  feedback.value == null
    ? { en: 'Feedback', zh: '用户反馈' }
    : [
        { en: feedback.value.title, zh: feedback.value.title },
        { en: 'Feedback', zh: '用户反馈' }
      ]
)

const handleMarkAsHandled = useMessageHandle(
  async () => {
    try {
      await feedbackAdminApis.updateFeedback(props.feedbackID, { status: FeedbackStatus.Handled })
    } catch (e) {
      if (e instanceof ApiException && e.code === ApiExceptionCode.errorConflict)
        throw new DefaultException({
          en: 'This feedback has already been handled',
          zh: '该反馈已被处理'
        })
      throw e
    } finally {
      feedbackQuery.refetch()
    }
  },
  { en: 'Failed to update feedback status', zh: '更新反馈状态失败' },
  { en: 'Feedback marked as handled', zh: '反馈已标记为已处理' }
)
</script>

<template>
  <section class="min-w-0">
    <RouterLink
      class="mb-4 inline-flex items-center gap-1 text-sm text-primary-main no-underline hover:underline"
      to="/admin/feedback"
    >
      <UIIcon class="h-3.5 w-3.5 rotate-180" type="arrowRightSmall" />
      {{ $t({ en: 'Back to feedback', zh: '返回反馈列表' }) }}
    </RouterLink>

    <UIError v-if="!canManageFeedback" class="py-12">
      {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
      <template #sub-message>
        {{
          $t({ en: 'Managing feedback requires feedback admin permission.', zh: '管理用户反馈需要反馈管理员权限。' })
        }}
      </template>
    </UIError>

    <UILoading v-else-if="feedbackQuery.isLoading.value" class="my-16" />
    <UIError v-else-if="feedbackQuery.error.value != null" class="py-12">
      {{ $t(feedbackQuery.error.value.userMessage) }}
    </UIError>

    <div v-else-if="feedback != null" class="flex flex-col gap-5">
      <header class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="m-0 break-words text-xl font-semibold text-title">{{ feedback.title }}</h2>
            <span
              class="rounded px-2 py-0.5 text-xs font-medium"
              :class="
                feedback.status === FeedbackStatus.New
                  ? 'bg-primary-100 text-primary-main'
                  : 'bg-grey-300 text-grey-800'
              "
            >
              {{ $t(feedbackStatusLabels[feedback.status]) }}
            </span>
          </div>
          <div class="mt-1 text-sm text-grey-800">
            {{
              $t({
                en: `Submitted by ${feedback.owner} at ${formatTime(feedback.createdAt)}`,
                zh: `${feedback.owner} 提交于 ${formatTime(feedback.createdAt)}`
              })
            }}
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <UIButton
            v-if="feedback.status === FeedbackStatus.New"
            v-radar="{ name: 'Mark as handled', desc: 'Mark this feedback as handled' }"
            type="primary"
            :loading="handleMarkAsHandled.isLoading.value"
            @click="handleMarkAsHandled.fn"
          >
            {{ $t({ en: 'Mark as handled', zh: '标记为已处理' }) }}
          </UIButton>
          <UIButton
            v-radar="{ name: 'Refresh feedback', desc: 'Reload feedback details' }"
            icon="reload"
            shape="square"
            type="white"
            @click="feedbackQuery.refetch"
          />
        </div>
      </header>

      <section class="rounded-lg border border-grey-400 bg-white p-5">
        <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Description', zh: '描述' }) }}</h3>
        <p class="m-0 mt-3 whitespace-pre-wrap break-words text-sm text-grey-1000">{{ feedback.description }}</p>
      </section>

      <section class="rounded-lg border border-grey-400 bg-white p-5">
        <h3 class="m-0 text-lg font-semibold text-title">
          {{ $t({ en: 'Page state', zh: '页面状态' }) }}
        </h3>
        <p v-if="rawContext == null" class="m-0 mt-3 text-sm text-grey-800">
          {{ $t({ en: 'The user did not share page state.', zh: '用户未分享页面状态。' }) }}
        </p>
        <div v-else class="mt-4 flex flex-col gap-5 text-sm">
          <p v-if="context == null" class="m-0 text-grey-800">
            {{
              $t({
                en: 'The page state has an unrecognized format. See the raw data below.',
                zh: '页面状态格式无法识别，请查看下方原始数据。'
              })
            }}
          </p>
          <template v-else>
            <div class="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              <div>
                <div class="text-grey-800">{{ $t({ en: 'Source', zh: '来源' }) }}</div>
                <div class="mt-1 text-grey-1000">{{ $t(feedbackSourceLabels[context.source]) }}</div>
              </div>
              <div class="min-w-0">
                <div class="text-grey-800">{{ $t({ en: 'Page', zh: '页面' }) }}</div>
                <div class="mt-1 break-all font-mono text-xs text-grey-1000">{{ context.page.path }}</div>
              </div>
              <div>
                <div class="text-grey-800">{{ $t({ en: 'Language', zh: '语言' }) }}</div>
                <div class="mt-1 text-grey-1000">{{ context.page.language }}</div>
              </div>
              <div class="min-w-0">
                <div class="text-grey-800">{{ $t({ en: 'Project', zh: '项目' }) }}</div>
                <div class="mt-1 break-all text-grey-1000">
                  {{
                    context.project == null
                      ? '-'
                      : `${context.project.displayName} (${context.project.identifier ?? $t({ en: 'unsaved', zh: '未保存' })})`
                  }}
                </div>
              </div>
            </div>

            <div v-if="context.diagnostics != null">
              <div class="text-grey-800">{{ $t({ en: 'Code errors and warnings', zh: '代码错误与警告' }) }}</div>
              <ul class="m-0 mt-2 flex list-none flex-col gap-1 p-0 font-mono text-xs">
                <li v-for="(diagnostic, i) in context.diagnostics" :key="i" class="break-words">
                  <span
                    :class="diagnostic.severity === DiagnosticSeverity.Error ? 'text-danger-main' : 'text-yellow-600'"
                    >{{ diagnostic.severity }}</span
                  >
                  {{ diagnostic.file }}:{{ diagnostic.line }} {{ diagnostic.message }}
                </li>
              </ul>
            </div>

            <div v-if="context.runtimeOutputs != null">
              <div class="text-grey-800">{{ $t({ en: 'Runtime output', zh: '运行输出' }) }}</div>
              <ul class="m-0 mt-2 flex max-h-96 list-none flex-col gap-1 overflow-auto p-0 font-mono text-xs">
                <li v-for="(output, i) in context.runtimeOutputs" :key="i" class="break-words">
                  <span class="text-grey-700">{{ formatOutputTime(output.time) }}</span>
                  <span :class="output.kind === RuntimeOutputKind.Error ? 'text-danger-main' : null">
                    [{{ output.kind }}]</span
                  >
                  <span v-if="output.file != null"> {{ output.file }}:{{ output.line }}</span>
                  {{ output.message }}
                </li>
              </ul>
            </div>
          </template>

          <details :open="context == null">
            <summary class="cursor-pointer select-none font-medium text-primary-main">
              {{ $t({ en: 'View raw data', zh: '查看原始数据' }) }}
            </summary>
            <pre class="mt-2 max-h-96 overflow-auto rounded bg-grey-200 p-3 text-xs text-grey-1000">{{
              formatJSON(rawContext)
            }}</pre>
          </details>
        </div>
      </section>
    </div>
  </section>
</template>
