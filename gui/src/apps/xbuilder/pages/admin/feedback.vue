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
import { computed, nextTick, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'

import { DefaultException, useMessageHandle } from '@/utils/exception'
import { imgExts } from '@/utils/file'
import { useI18n } from '@/utils/i18n'
import { extname } from '@/utils/path'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { saveFile, selectFilesWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile } from '@/models/common/file'
import { useSignedIn } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { FeedbackStatus } from '@/apis/feedback'
import { UIButton, UIError, UIForm, UIFormItem, UIIcon, UILoading, UITextInput, useForm } from '@/components/ui'
import { RuntimeOutputKind } from '@/components/editor/runtime'
import { DiagnosticSeverity } from '@/components/editor/spx-code-editor'
import { feedbackContextSchema } from '@/components/feedback/context'
import NotificationMarkdown from '@/components/notification/NotificationMarkdown.vue'
import * as feedbackAdminApis from '@/apis/admin/feedback'
import { feedbackStatusLabels, formatJSON, formatTime } from './common'

const props = defineProps<{
  feedbackID: string
}>()

const i18n = useI18n()
const signedIn = useSignedIn()
const canManageFeedback = computed(() => signedIn.user?.capabilities.canManageFeedback === true)

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

/** Process feedback in the `new` status, then reload it to show the latest status */
async function processFeedback(process: () => Promise<unknown>) {
  try {
    await process()
  } catch (e) {
    // Reload only on conflicts, as a failed reload would replace the page and the reply draft with an error
    if (!(e instanceof ApiException) || e.code !== ApiExceptionCode.errorConflict) throw e
    feedbackQuery.refetch()
    throw new DefaultException({
      en: 'This feedback has already been processed',
      zh: '该反馈已被处理'
    })
  }
  feedbackQuery.refetch()
}

const replyForm = useForm({
  content: ['', validateReplyContent]
})

function validateReplyContent(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return i18n.t({ en: 'The reply must not be blank', zh: '回复不可为空' })
  const maxLength = feedbackAdminApis.feedbackReplyContentMaxLength
  if (trimmed.length > maxLength)
    return i18n.t({
      en: `The reply must be ${maxLength} characters or fewer`,
      zh: `回复不能超过 ${maxLength} 字`
    })
  return null
}

const replyContentInput = useTemplateRef('replyContentInput')

async function addReplyImages() {
  const input = replyContentInput.value?.getInputElement()
  if (input == null) return
  let start = input.selectionStart ?? replyForm.value.content.length
  let end = input.selectionEnd ?? start
  const nativeFiles = await selectFilesWithUploadLimit({ accept: imgExts })
  if (nativeFiles.some((file) => !imgExts.includes(extname(file.name).slice(1).toLowerCase())))
    throw new DefaultException({
      en: `Only images can be attached (${imgExts.join(', ')})`,
      zh: `只能添加图片（${imgExts.join('、')}）`
    })
  for (const file of nativeFiles) {
    const url = await saveFile(fromNativeFile(file), { inlineable: false })
    const name = file.name.replace(/[\r\n]/g, ' ').replace(/[\\[\]]/g, '\\$&')
    const image = `\n\n![${name}](<${url}>)\n\n`
    const content = replyForm.value.content
    replyForm.value.content = content.slice(0, start) + image + content.slice(end)
    start += image.length
    end = start
  }
  await nextTick()
  input.focus()
  input.setSelectionRange(start, start)
}

const handleAddReplyImages = useMessageHandle(addReplyImages, { en: 'Failed to add images', zh: '添加图片失败' })

const handleSendReply = useMessageHandle(
  async () => {
    const content = replyForm.value.content.trim()
    await processFeedback(() => feedbackAdminApis.createFeedbackReply(props.feedbackID, { content }))
  },
  { en: 'Failed to send reply', zh: '发送回复失败' },
  { en: 'Reply sent', zh: '回复已发送' }
)

const handleMarkAsNoReplyNeeded = useMessageHandle(
  () => processFeedback(() => feedbackAdminApis.updateFeedback(props.feedbackID, { status: FeedbackStatus.Handled })),
  { en: 'Failed to update feedback status', zh: '更新反馈状态失败' },
  { en: 'Marked as no reply needed', zh: '已标记为无需回复' }
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
            v-radar="{ name: 'no-reply-needed-button', desc: 'Close this feedback without notifying the user' }"
            type="primary"
            :disabled="handleSendReply.isLoading.value || handleAddReplyImages.isLoading.value"
            :loading="handleMarkAsNoReplyNeeded.isLoading.value"
            @click="handleMarkAsNoReplyNeeded.fn"
          >
            {{ $t({ en: 'Mark as no reply needed', zh: '标记为无需回复' }) }}
          </UIButton>
          <UIButton
            v-radar="{ name: 'refresh-feedback', desc: 'Reload feedback details' }"
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
              <div>
                <div class="text-grey-800">{{ $t({ en: 'Project snapshot', zh: '项目快照' }) }}</div>
                <div class="mt-1 text-grey-1000">
                  <RouterLink
                    v-if="context.projectSnapshotUrl != null"
                    v-radar="{ name: 'open-project-snapshot', desc: 'Open the project snapshot in the editor' }"
                    class="text-primary-main no-underline hover:underline"
                    :to="`/admin/feedback/${encodeURIComponent(feedback.id)}/project-snapshot`"
                  >
                    {{ $t({ en: 'Open in editor', zh: '在编辑器中打开' }) }}
                  </RouterLink>
                  <template v-else>-</template>
                </div>
              </div>
            </div>

            <details v-if="context.diagnostics != null">
              <summary class="cursor-pointer select-none font-medium text-primary-main">
                {{
                  $t({
                    en: `Code errors and warnings (${context.diagnostics.length})`,
                    zh: `代码错误与警告（${context.diagnostics.length}）`
                  })
                }}
              </summary>
              <ul class="m-0 mt-2 flex max-h-96 list-none flex-col gap-1 overflow-auto p-0 font-mono text-xs">
                <li v-for="(diagnostic, i) in context.diagnostics" :key="i" class="break-words">
                  <span
                    :class="diagnostic.severity === DiagnosticSeverity.Error ? 'text-danger-main' : 'text-yellow-600'"
                    >{{ diagnostic.severity }}</span
                  >
                  {{ diagnostic.file }}:{{ diagnostic.line }} {{ diagnostic.message }}
                </li>
              </ul>
            </details>

            <details v-if="context.runtimeOutputs != null">
              <summary class="cursor-pointer select-none font-medium text-primary-main">
                {{
                  $t({
                    en: `Runtime output (${context.runtimeOutputs.length})`,
                    zh: `运行输出（${context.runtimeOutputs.length}）`
                  })
                }}
              </summary>
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
            </details>
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

      <section v-if="feedback.status === FeedbackStatus.New" class="rounded-lg border border-grey-400 bg-white p-5">
        <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Reply to user', zh: '回复用户' }) }}</h3>
        <UIForm :form="replyForm" @submit="handleSendReply.fn">
          <UIFormItem class="mt-3" path="content">
            <UITextInput
              ref="replyContentInput"
              v-model:value="replyForm.value.content"
              v-radar="{ name: 'reply-content-input', desc: 'Write the reply delivered to the user as a notification' }"
              type="textarea"
              :rows="4"
              :disabled="handleSendReply.isLoading.value"
              :readonly="handleAddReplyImages.isLoading.value"
              :placeholder="$t({ en: 'Write a clear reply for the user', zh: '填写一条清晰的用户回复' })"
            />
          </UIFormItem>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <UIButton
              v-radar="{ name: 'add-reply-images-button', desc: 'Attach images to the reply' }"
              type="white"
              size="small"
              icon="plus"
              :disabled="handleSendReply.isLoading.value"
              :loading="handleAddReplyImages.isLoading.value"
              @click="handleAddReplyImages.fn"
            >
              {{ $t({ en: 'Add images', zh: '添加图片' }) }}
            </UIButton>
            <span class="text-xs text-grey-700">
              {{
                $t({
                  en: 'Supports Markdown. Images count toward the reply length.',
                  zh: '支持 Markdown，图片代码计入回复字数。'
                })
              }}
            </span>
          </div>
          <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
            <span class="text-xs text-grey-800">
              {{ $t({ en: 'The user will receive a notification.', zh: '用户会收到通知。' }) }}
            </span>
            <UIButton
              v-radar="{ name: 'send-reply-button', desc: 'Send this reply to the user as a notification' }"
              html-type="submit"
              :disabled="handleMarkAsNoReplyNeeded.isLoading.value || handleAddReplyImages.isLoading.value"
              :loading="handleSendReply.isLoading.value"
            >
              {{ $t({ en: 'Send reply', zh: '发送回复' }) }}
            </UIButton>
          </div>
        </UIForm>
      </section>

      <section v-else-if="feedback.reply != null" class="rounded-lg border border-grey-400 bg-white p-5">
        <h3 class="m-0 text-lg font-semibold text-title">{{ $t({ en: 'Reply', zh: '回复' }) }}</h3>
        <NotificationMarkdown class="mt-3" :value="feedback.reply.content" :time="feedback.reply.createdAt" />
      </section>
    </div>
  </section>
</template>
