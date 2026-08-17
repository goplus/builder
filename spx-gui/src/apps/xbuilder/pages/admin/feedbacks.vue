<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { usePageTitle } from '@/utils/utils'
import { UIButton, UIIcon, UITextInput } from '@/components/ui'
import { useFeedbackDemoModel } from '@/components/feedback-demo/model'
import type {
  FeedbackAttachment,
  FeedbackSource,
  FeedbackStatus,
  FeedbackSubmission
} from '@/components/feedback-demo/mock-data'

usePageTitle({ en: 'Feedback', zh: '用户反馈' })

const router = useRouter()
const i18n = useI18n()
const feedbackDemo = useFeedbackDemoModel()
const selectedFeedbackID = ref<string | null>(null)
const reply = ref('')
const replyAttachments = ref<FeedbackAttachment[]>([])
const replySent = ref(false)

const sourceLabels: Record<FeedbackSource, LocaleMessage> = {
  globalForm: { en: 'Profile', zh: '个人中心' }
}

const statusLabels = {
  new: { en: 'Pending', zh: '待处理' },
  handled: { en: 'No reply needed', zh: '无需回复' },
  replied: { en: 'Replied', zh: '已回复' }
} satisfies Record<FeedbackSubmission['status'], LocaleMessage>

const statusClasses: Record<FeedbackStatus, string> = {
  new: 'bg-primary-100 text-primary-main',
  handled: 'bg-grey-300 text-grey-800',
  replied: 'bg-green-100 text-green-700'
}

const selectedFeedback = computed(
  () => feedbackDemo.data.feedbacks.find((feedback) => feedback.id === selectedFeedbackID.value) ?? null
)

const pendingCount = computed(() => feedbackDemo.data.feedbacks.filter((feedback) => feedback.status === 'new').length)

watch(selectedFeedbackID, () => {
  reply.value = ''
  replyAttachments.value = []
  replySent.value = false
})

function handleReply() {
  if (selectedFeedback.value == null) return
  const updated = feedbackDemo.replyToFeedback(selectedFeedback.value.id, reply.value, replyAttachments.value)
  if (updated == null) return
  reply.value = ''
  replyAttachments.value = []
  replySent.value = true
}

function handleMarkHandled() {
  if (selectedFeedback.value == null) return
  feedbackDemo.markFeedbackHandled(selectedFeedback.value.id)
  reply.value = ''
  replyAttachments.value = []
}

function handleReplyFiles(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files == null) return
  const sequence = Date.now()
  replyAttachments.value = [
    ...replyAttachments.value,
    ...Array.from(input.files).map((file, index) => ({
      id: `reply-attachment-${sequence}-${index}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file)
    }))
  ]
  input.value = ''
}

function removeReplyAttachment(id: string) {
  const attachment = replyAttachments.value.find((item) => item.id === id)
  if (attachment?.url?.startsWith('blob:')) URL.revokeObjectURL(attachment.url)
  replyAttachments.value = replyAttachments.value.filter((attachment) => attachment.id !== id)
}

function showUserNotification() {
  feedbackDemo.openNotificationCenter()
  router.push('/')
}

function resetMockData() {
  feedbackDemo.reset()
  selectedFeedbackID.value = null
  reply.value = ''
  replyAttachments.value = []
  replySent.value = false
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(i18n.lang.value === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatListTime(value: string) {
  return new Intl.DateTimeFormat(i18n.lang.value === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatPosition(position: { line: number; column: number }) {
  return `${position.line}:${position.column}`
}

function formatNames(names: string[]) {
  return names.length === 0 ? i18n.t({ en: 'None', zh: '无' }) : names.join(', ')
}

function formatCodeSample(sampledLines: Record<string, string>) {
  const entries = Object.entries(sampledLines)
  const lineNumberWidth = entries.reduce((width, [line]) => Math.max(width, line.length), 1)
  return entries.map(([line, content]) => `${line.padStart(lineNumberWidth)} | ${content}`).join('\n')
}

function formatRuntimeTime(value: string) {
  return new Intl.DateTimeFormat(i18n.lang.value === 'zh' ? 'zh-CN' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value))
}
</script>

<template>
  <section class="min-w-0">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="m-0 text-xl font-semibold text-title">{{ $t({ en: 'User feedback', zh: '用户反馈' }) }}</h2>
        <p class="m-0 mt-1 text-sm text-grey-800">
          {{
            $t({
              en: 'Review and process user feedback.',
              zh: '查看并处理用户反馈。'
            })
          }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-main">
          {{ $t({ en: `${pendingCount} pending`, zh: `${pendingCount} 条待处理` }) }}
        </span>
        <UIButton
          v-radar="{ name: 'Reset feedback demo data', desc: 'Restore the editable feedback demo fixtures' }"
          type="white"
          icon="reload"
          @click="resetMockData"
        >
          {{ $t({ en: 'Reset demo data', zh: '重置演示数据' }) }}
        </UIButton>
      </div>
    </div>

    <div
      class="grid min-h-[600px] overflow-hidden rounded-lg border border-grey-400 bg-white desktop:grid-cols-[22rem_minmax(0,1fr)]"
    >
      <div
        class="border-b border-grey-400 desktop:block desktop:border-r desktop:border-b-0"
        :class="selectedFeedback != null ? 'hidden' : 'block'"
      >
        <div class="border-b border-grey-400 bg-grey-100 px-4 py-3 text-sm font-medium text-title">
          {{ $t({ en: 'All feedback', zh: '全部反馈' }) }} · {{ feedbackDemo.data.feedbacks.length }}
        </div>
        <div class="max-h-[650px] overflow-y-auto">
          <button
            v-for="feedback in feedbackDemo.data.feedbacks"
            :key="feedback.id"
            v-radar="{ name: 'Feedback item', desc: `Open feedback: ${feedback.title}` }"
            type="button"
            :aria-current="selectedFeedbackID === feedback.id ? 'true' : undefined"
            class="block w-full appearance-none cursor-pointer border-x-0 border-t-0 border-b border-grey-300 px-4 py-4 text-left shadow-none transition-colors focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-primary-main"
            :class="
              selectedFeedbackID === feedback.id
                ? 'bg-primary-100 hover:bg-primary-100'
                : 'bg-transparent hover:bg-grey-100'
            "
            @click="selectedFeedbackID = feedback.id"
          >
            <div class="flex items-start justify-between gap-3">
              <span class="line-clamp-2 text-sm font-medium leading-5 text-title">{{ feedback.title }}</span>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-xs" :class="statusClasses[feedback.status]">
                {{ $t(statusLabels[feedback.status]) }}
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs text-grey-700">
              <span>{{ feedback.userDisplayName }}</span>
              <time>{{ formatListTime(feedback.createdAt) }}</time>
            </div>
          </button>
        </div>
      </div>

      <div v-if="selectedFeedback != null" class="p-5 tablet:p-7">
        <UIButton type="white" size="small" class="mb-4 desktop:hidden" @click="selectedFeedbackID = null">
          <template #icon>
            <UIIcon type="arrowRightSmall" class="size-3.5 rotate-180" />
          </template>
          {{ $t({ en: 'Feedback list', zh: '反馈列表' }) }}
        </UIButton>
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-grey-400 pb-5">
          <div>
            <div class="mb-2 flex flex-wrap gap-2 text-xs">
              <span class="rounded-full px-2.5 py-1" :class="statusClasses[selectedFeedback.status]">
                {{ $t(statusLabels[selectedFeedback.status]) }}
              </span>
            </div>
            <h3 class="text-xl font-semibold text-title">{{ selectedFeedback.title }}</h3>
            <p class="mt-1 text-xs text-grey-800">
              {{ selectedFeedback.userDisplayName }} · {{ formatTime(selectedFeedback.createdAt) }}
            </p>
          </div>
        </div>

        <div class="py-6">
          <h4 class="text-sm font-semibold text-title">{{ $t({ en: 'Description', zh: '描述' }) }}</h4>
          <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-grey-1000">{{ selectedFeedback.description }}</p>

          <template v-if="selectedFeedback.attachments.length > 0">
            <h4 class="mt-6 text-sm font-semibold text-title">{{ $t({ en: 'Attachments', zh: '附件' }) }}</h4>
            <div class="mt-2 flex flex-wrap gap-2">
              <template v-for="attachment in selectedFeedback.attachments" :key="attachment.id">
                <a
                  v-if="attachment.url != null"
                  class="inline-flex items-center gap-2 rounded-md bg-grey-300 px-3 py-2 text-xs text-grey-900 no-underline transition-colors hover:bg-grey-400 hover:text-primary-main focus-visible:outline-2 focus-visible:outline-primary-main"
                  :href="attachment.url"
                  target="_blank"
                  rel="noreferrer"
                >
                  <UIIcon type="file" class="size-3.5" />
                  {{ attachment.name }} · {{ formatFileSize(attachment.size) }}
                </a>
                <span
                  v-else
                  class="inline-flex items-center gap-2 rounded-md bg-grey-300 px-3 py-2 text-xs text-grey-900"
                >
                  <UIIcon type="file" class="size-3.5" />
                  {{ attachment.name }} · {{ formatFileSize(attachment.size) }}
                </span>
              </template>
            </div>
          </template>

          <dl class="mt-6 grid gap-3 border-t border-grey-300 pt-5 text-xs tablet:grid-cols-2">
            <div>
              <dt class="text-grey-800">{{ $t({ en: 'Submitted from', zh: '提交入口' }) }}</dt>
              <dd class="mt-1 text-grey-1000">{{ $t(sourceLabels[selectedFeedback.source]) }}</dd>
            </div>
            <div>
              <dt class="text-grey-800">{{ $t({ en: 'Feedback ID', zh: '反馈 ID' }) }}</dt>
              <dd class="mt-1 select-all font-mono text-grey-1000">{{ selectedFeedback.id }}</dd>
            </div>
          </dl>

          <section v-if="selectedFeedback.context != null" class="mt-6 border-t border-grey-300 pt-5">
            <div class="flex items-baseline justify-between gap-3">
              <h4 class="text-sm font-semibold text-title">{{ $t({ en: 'Shared context', zh: '已分享的上下文' }) }}</h4>
              <time class="text-xs text-grey-800">{{ formatTime(selectedFeedback.context.capturedAt) }}</time>
            </div>
            <dl class="mt-3 grid gap-3 text-xs tablet:grid-cols-2">
              <div>
                <dt class="text-grey-800">{{ $t({ en: 'Page', zh: '页面' }) }}</dt>
                <dd class="mt-1 break-all font-mono text-grey-1000">{{ selectedFeedback.context.page.fullPath }}</dd>
              </div>
              <div>
                <dt class="text-grey-800">{{ $t({ en: 'Interface language', zh: '界面语言' }) }}</dt>
                <dd class="mt-1 text-grey-1000">
                  {{ selectedFeedback.context.page.language === 'zh' ? '简体中文' : 'English' }}
                </dd>
              </div>
            </dl>

            <details v-if="selectedFeedback.context.project != null" class="mt-4 border-t border-grey-300">
              <summary class="cursor-pointer py-3 text-xs font-semibold text-title">
                {{ $t({ en: 'Project structure', zh: '项目结构' }) }}
              </summary>
              <dl class="grid gap-3 pb-4 text-xs tablet:grid-cols-2">
                <div>
                  <dt class="text-grey-800">{{ $t({ en: 'Project', zh: '项目' }) }}</dt>
                  <dd class="mt-1 text-grey-1000">
                    {{ selectedFeedback.context.project.displayName }}
                    <template v-if="selectedFeedback.context.project.identifier != null">
                      · {{ selectedFeedback.context.project.identifier }}
                    </template>
                    · {{ selectedFeedback.context.project.type }}
                  </dd>
                </div>
                <div>
                  <dt class="text-grey-800">{{ $t({ en: 'Physics', zh: '物理引擎' }) }}</dt>
                  <dd class="mt-1 text-grey-1000">
                    {{
                      selectedFeedback.context.project.content.physicsEnabled
                        ? $t({ en: 'Enabled', zh: '已启用' })
                        : $t({ en: 'Disabled', zh: '未启用' })
                    }}
                  </dd>
                </div>
                <div>
                  <dt class="text-grey-800">
                    {{ $t({ en: 'Sprites', zh: '角色' }) }} ·
                    {{ selectedFeedback.context.project.content.sprites.length }}
                  </dt>
                  <dd class="mt-1 break-words text-grey-1000">
                    {{ formatNames(selectedFeedback.context.project.content.sprites) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-grey-800">
                    {{ $t({ en: 'Sounds', zh: '声音' }) }} ·
                    {{ selectedFeedback.context.project.content.sounds.length }}
                  </dt>
                  <dd class="mt-1 break-words text-grey-1000">
                    {{ formatNames(selectedFeedback.context.project.content.sounds) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-grey-800">
                    {{ $t({ en: 'Backdrops', zh: '背景' }) }} ·
                    {{ selectedFeedback.context.project.content.backdrops.length }}
                  </dt>
                  <dd class="mt-1 break-words text-grey-1000">
                    {{ formatNames(selectedFeedback.context.project.content.backdrops) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-grey-800">
                    {{ $t({ en: 'Widgets', zh: '控件' }) }} ·
                    {{ selectedFeedback.context.project.content.widgets.length }}
                  </dt>
                  <dd class="mt-1 break-words text-grey-1000">
                    {{ formatNames(selectedFeedback.context.project.content.widgets) }}
                  </dd>
                </div>
              </dl>
            </details>

            <details v-if="selectedFeedback.context.selectedSprite != null" class="border-t border-grey-300">
              <summary class="cursor-pointer py-3 text-xs font-semibold text-title">
                {{ $t({ en: 'Selected sprite', zh: '所选角色' }) }} ·
                {{ selectedFeedback.context.selectedSprite.name }}
              </summary>
              <dl class="grid gap-3 pb-4 text-xs tablet:grid-cols-2">
                <div>
                  <dt class="text-grey-800">
                    {{ $t({ en: 'Costumes', zh: '造型' }) }} ·
                    {{ selectedFeedback.context.selectedSprite.costumes.length }}
                  </dt>
                  <dd class="mt-1 break-words text-grey-1000">
                    {{ formatNames(selectedFeedback.context.selectedSprite.costumes) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-grey-800">
                    {{ $t({ en: 'Animations', zh: '动画' }) }} ·
                    {{ selectedFeedback.context.selectedSprite.animations.length }}
                  </dt>
                  <dd class="mt-1 break-words text-grey-1000">
                    {{ formatNames(selectedFeedback.context.selectedSprite.animations) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-grey-800">{{ $t({ en: 'Position and size', zh: '位置与大小' }) }}</dt>
                  <dd class="mt-1 font-mono text-grey-1000">
                    x {{ selectedFeedback.context.selectedSprite.x }}, y
                    {{ selectedFeedback.context.selectedSprite.y }} ·
                    {{ selectedFeedback.context.selectedSprite.size }}%
                  </dd>
                </div>
                <div>
                  <dt class="text-grey-800">{{ $t({ en: 'State', zh: '状态' }) }}</dt>
                  <dd class="mt-1 text-grey-1000">
                    {{ selectedFeedback.context.selectedSprite.rotationStyle }} ·
                    {{ selectedFeedback.context.selectedSprite.heading }}° ·
                    {{
                      selectedFeedback.context.selectedSprite.visible
                        ? $t({ en: 'Visible', zh: '可见' })
                        : $t({ en: 'Hidden', zh: '隐藏' })
                    }}
                    · {{ selectedFeedback.context.selectedSprite.codeLinesNum }}
                    {{ $t({ en: 'lines', zh: '行代码' }) }}
                  </dd>
                </div>
              </dl>
            </details>

            <details v-if="selectedFeedback.context.code != null" class="border-t border-grey-300">
              <summary class="cursor-pointer py-3 text-xs font-semibold text-title">
                {{ $t({ en: 'Nearby source', zh: '附近代码' }) }} · {{ selectedFeedback.context.code.file }}
              </summary>
              <div class="pb-4 text-xs">
                <p class="break-all text-grey-800">
                  <template v-if="selectedFeedback.context.code.cursor != null">
                    {{ $t({ en: 'Cursor', zh: '光标' }) }}
                    {{ formatPosition(selectedFeedback.context.code.cursor) }}
                  </template>
                  <template v-if="selectedFeedback.context.code.selection != null">
                    · {{ $t({ en: 'Selection', zh: '选区' }) }}
                    {{ formatPosition(selectedFeedback.context.code.selection.start) }}–{{
                      formatPosition(selectedFeedback.context.code.selection.end)
                    }}
                  </template>
                  · {{ selectedFeedback.context.code.sample.lineCount }} {{ $t({ en: 'lines total', zh: '行总计' }) }}
                </p>
                <pre class="mt-2 overflow-x-auto rounded-md bg-grey-100 p-3 font-mono leading-5 text-grey-1000">{{
                  formatCodeSample(selectedFeedback.context.code.sample.sampledLines)
                }}</pre>
              </div>
            </details>

            <details v-if="selectedFeedback.context.diagnostics?.length" class="border-t border-grey-300">
              <summary class="cursor-pointer py-3 text-xs font-semibold text-title">
                {{ $t({ en: 'Code diagnostics', zh: '代码诊断' }) }} ·
                {{ selectedFeedback.context.diagnostics.length }}
              </summary>
              <ul class="space-y-2 pb-4 text-xs text-grey-900">
                <li
                  v-for="(diagnostic, index) in selectedFeedback.context.diagnostics"
                  :key="`${diagnostic.file}-${diagnostic.line}-${index}`"
                >
                  <span class="font-mono">{{ diagnostic.file }}:{{ diagnostic.line }}</span>
                  <span class="mx-1 text-grey-600">·</span>
                  {{ diagnostic.message }}
                </li>
              </ul>
            </details>

            <details v-if="selectedFeedback.context.runtimeOutputs?.length" class="border-t border-grey-300">
              <summary class="cursor-pointer py-3 text-xs font-semibold text-title">
                {{ $t({ en: 'Runtime output', zh: '运行输出' }) }} ·
                {{ selectedFeedback.context.runtimeOutputs.length }}
              </summary>
              <ul class="space-y-2 pb-4 text-xs text-grey-900">
                <li v-for="(output, index) in selectedFeedback.context.runtimeOutputs" :key="`${output.time}-${index}`">
                  <time class="font-mono text-grey-700">{{ formatRuntimeTime(output.time) }}</time>
                  <span class="mx-1 text-grey-600">·</span>
                  <span :class="output.kind === 'error' ? 'font-medium text-red-main' : 'text-grey-800'">
                    {{ output.kind === 'error' ? 'ERROR' : 'LOG' }}
                  </span>
                  <template v-if="output.file != null">
                    <span class="mx-1 text-grey-600">·</span>
                    <span class="font-mono">
                      {{ output.file }}<template v-if="output.line != null">:{{ output.line }}</template>
                    </span>
                  </template>
                  <span class="mx-1 text-grey-600">·</span>
                  {{ output.message }}
                </li>
              </ul>
            </details>
          </section>
        </div>

        <div v-if="selectedFeedback.status === 'new'" class="rounded-lg border border-grey-400 bg-grey-100 p-4">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-title">{{ $t({ en: 'Reply to user', zh: '回复用户' }) }}</span>
            <UITextInput
              v-model:value="reply"
              v-radar="{ name: 'Support reply', desc: 'Write the one-time message delivered to the user' }"
              type="textarea"
              :rows="4"
              :maxlength="1000"
              :placeholder="$t({ en: 'Write a clear reply for the user', zh: '填写一条清晰的用户回复' })"
            />
          </label>
          <div class="mt-3">
            <label
              class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-grey-500 bg-white px-3 py-2 text-xs text-grey-900 transition-colors hover:border-primary-main hover:bg-primary-100 focus-within:border-primary-main focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-main"
            >
              <UIIcon type="localFile" class="size-3.5" />
              {{ $t({ en: 'Attach files', zh: '添加附件' }) }}
              <input
                v-radar="{ name: 'Reply attachments', desc: 'Choose optional files to send with the support reply' }"
                class="sr-only"
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.log,.zip"
                @change="handleReplyFiles"
              />
            </label>
            <div v-if="replyAttachments.length > 0" class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="attachment in replyAttachments"
                :key="attachment.id"
                class="inline-flex items-center gap-2 rounded-md bg-grey-300 px-2.5 py-1.5 text-xs text-grey-900"
              >
                <UIIcon type="file" class="size-3.5" />
                {{ attachment.name }} · {{ formatFileSize(attachment.size) }}
                <button
                  v-radar="{ name: 'Remove reply attachment', desc: `Remove ${attachment.name} from the reply` }"
                  :aria-label="
                    $t({
                      en: `Remove reply attachment: ${attachment.name}`,
                      zh: `移除回复附件：${attachment.name}`
                    })
                  "
                  type="button"
                  class="inline-flex size-6 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-grey-800 transition-colors hover:bg-grey-400 active:bg-grey-500 hover:text-red-main focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-main"
                  @click="removeReplyAttachment(attachment.id)"
                >
                  <UIIcon type="close" class="size-3" />
                </button>
              </span>
            </div>
          </div>
          <div class="mt-3 flex flex-col gap-3 tablet:flex-row tablet:items-end tablet:justify-between">
            <UIButton type="white" @click="handleMarkHandled">
              {{ $t({ en: 'Mark as no reply needed', zh: '标记为无需回复' }) }}
            </UIButton>
            <div class="flex flex-col items-start gap-2 tablet:items-end">
              <p class="text-xs text-grey-800">
                {{ $t({ en: 'The user will receive a notification.', zh: '用户会收到通知。' }) }}
              </p>
              <UIButton
                v-radar="{ name: 'Send support reply', desc: 'Send this reply as a notification' }"
                :disabled="reply.trim() === ''"
                @click="handleReply"
              >
                {{ $t({ en: 'Send reply', zh: '发送回复' }) }}
              </UIButton>
            </div>
          </div>
        </div>

        <div
          v-else-if="selectedFeedback.status === 'replied'"
          class="rounded-lg border border-green-300 bg-green-100 p-4"
        >
          <div class="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
            <div class="flex items-start gap-3">
              <UIIcon type="success" class="mt-0.5 shrink-0 text-green-600" />
              <div>
                <h4 class="text-sm font-semibold text-title">
                  {{ $t({ en: 'Reply sent', zh: '回复已发送' }) }}
                </h4>
                <p class="mt-1 text-sm leading-6 text-grey-1000">{{ selectedFeedback.reply }}</p>
                <div v-if="selectedFeedback.replyAttachments.length > 0" class="mt-3 flex flex-wrap gap-2">
                  <template v-for="attachment in selectedFeedback.replyAttachments" :key="attachment.id">
                    <a
                      v-if="attachment.url != null"
                      class="inline-flex items-center gap-2 rounded-md bg-white/70 px-2.5 py-1.5 text-xs text-grey-900 no-underline transition-colors hover:bg-white hover:text-primary-main focus-visible:outline-2 focus-visible:outline-primary-main"
                      :href="attachment.url"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <UIIcon type="file" class="size-3.5" />
                      {{ attachment.name }} · {{ formatFileSize(attachment.size) }}
                    </a>
                    <span
                      v-else
                      class="inline-flex items-center gap-2 rounded-md bg-white/70 px-2.5 py-1.5 text-xs text-grey-900"
                    >
                      <UIIcon type="file" class="size-3.5" />
                      {{ attachment.name }} · {{ formatFileSize(attachment.size) }}
                    </span>
                  </template>
                </div>
                <time v-if="selectedFeedback.repliedAt != null" class="mt-2 block text-xs text-grey-800">
                  {{ formatTime(selectedFeedback.repliedAt) }}
                </time>
              </div>
            </div>
            <UIButton v-if="replySent" type="white" size="small" @click="showUserNotification">
              {{ $t({ en: 'View user notification', zh: '查看用户端通知' }) }}
            </UIButton>
          </div>
        </div>

        <div v-else class="rounded-lg border border-grey-400 bg-grey-100 p-4">
          <div class="flex items-start gap-3">
            <UIIcon type="success" class="mt-0.5 shrink-0 text-green-600" />
            <div>
              <h4 class="text-sm font-semibold text-title">
                {{ $t({ en: 'Marked as no reply needed', zh: '已标记为无需回复' }) }}
              </h4>
              <p class="mt-1 text-sm text-grey-900">
                {{ $t({ en: 'No notification was sent to the user.', zh: '未向用户发送通知。' }) }}
              </p>
              <time v-if="selectedFeedback.handledAt != null" class="mt-2 block text-xs text-grey-800">
                {{ formatTime(selectedFeedback.handledAt) }}
              </time>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="hidden items-center justify-center p-8 text-sm text-grey-700 desktop:flex">
        {{ $t({ en: 'Select a feedback item', zh: '请选择一条反馈' }) }}
      </div>
    </div>
  </section>
</template>
