<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import { UIButton, UIFormModal, UIIcon, UIModal, useMessage } from '@/components/ui'
import { useCopilot } from '@/components/copilot/context'
import { RoundState } from '@/components/copilot/copilot'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorRef } from '@/components/xgo-code-editor'
import { createPrepareFeedbackTool, type PreparedFeedbackDraft } from './copilot'
import { captureFeedbackContext } from './context'
import FeedbackForm from './FeedbackForm.vue'
import { useFeedbackDemoModel, type SubmitFeedbackInput } from './model'
import type { FeedbackAttachment, InProductNotification } from './mock-data'
import { captureViewport } from '@/components/screenshot/capture'

const model = useFeedbackDemoModel()
const copilot = useCopilot()
const i18n = useI18n()
const { t } = i18n
const message = useMessage()
const route = useRoute()
const editorCtxRef = useEditorCtxRef()
const codeEditorRef = useCodeEditorRef()
const isSubmitting = ref(false)
const activeSubmission = ref<symbol | null>(null)
const pendingCopilotFeedback = ref<PreparedFeedbackDraft | null>(null)
const selectedNotificationID = ref<string | null>(null)
const notificationTransition = ref<'notification-forward' | 'notification-back'>('notification-forward')
const notificationTitleID = useId()
const selectedNotification = computed(
  () => model.data.notifications.find((notification) => notification.id === selectedNotificationID.value) ?? null
)

onScopeDispose(
  copilot.registerTool(
    createPrepareFeedbackTool((draft) => {
      pendingCopilotFeedback.value = draft
    })
  )
)

watch(
  () => copilot.currentSession?.currentRound?.state ?? null,
  (state) => {
    if (state === RoundState.Completed && pendingCopilotFeedback.value != null) {
      const draft = pendingCopilotFeedback.value
      pendingCopilotFeedback.value = null
      model.openFeedbackForm('globalForm', draft)
      return
    }
    if (state === RoundState.Cancelled || state === RoundState.Failed) pendingCopilotFeedback.value = null
  }
)

watch(model.activeFormSource, (source, previousSource) => {
  if (source != null) copilot.close()
  if (source == null && previousSource != null) {
    activeSubmission.value = null
    isSubmitting.value = false
  }
})

watch(model.notificationCenterOpen, (open) => {
  if (!open) selectedNotificationID.value = null
})

async function handleSubmit(input: SubmitFeedbackInput) {
  if (isSubmitting.value) return

  const submission = Symbol('feedback-submission')
  activeSubmission.value = submission
  isSubmitting.value = true
  try {
    await nextTick()
    await waitForNextPaint()

    const includeContext = input.includeContext !== false
    let screenshotUnavailable = false
    const [context, screenshot] = await Promise.all([
      includeContext
        ? captureFeedbackContext(editorCtxRef.value ?? null, codeEditorRef.value, route.fullPath, i18n.lang.value)
        : Promise.resolve(undefined),
      includeContext
        ? captureFeedbackScreenshot().catch(() => {
            screenshotUnavailable = true
            return null
          })
        : Promise.resolve(null)
    ])
    if (activeSubmission.value !== submission || model.activeFormSource.value !== input.source) return

    model.submitFeedback({
      ...input,
      attachments: screenshot == null ? input.attachments : [...input.attachments, screenshot],
      context
    })
    if (screenshotUnavailable) {
      message.warning(
        t({
          en: 'The page screenshot could not be prepared. Feedback was still sent.',
          zh: '页面截图暂时无法生成，反馈仍已提交。'
        })
      )
    }
    message.success(
      t({
        en: 'Feedback sent.',
        zh: '反馈已提交。'
      })
    )
  } catch {
    message.error(
      t({
        en: 'Feedback could not be sent. Try again.',
        zh: '反馈提交失败，请重试。'
      })
    )
  } finally {
    if (activeSubmission.value === submission) {
      activeSubmission.value = null
      isSubmitting.value = false
    }
  }
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      resolve()
      return
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function captureFeedbackScreenshot(): Promise<FeedbackAttachment> {
  const { blob } = await captureViewport()
  return {
    id: `screenshot-${Date.now()}`,
    name: 'feedback-screenshot.png',
    size: blob.size,
    url: URL.createObjectURL(blob)
  }
}

function openNotification(notification: InProductNotification) {
  notificationTransition.value = 'notification-forward'
  selectedNotificationID.value = notification.id
  model.markNotificationRead(notification.id)
}

function backToNotificationList() {
  notificationTransition.value = 'notification-back'
  selectedNotificationID.value = null
}

function formatTime(value: string) {
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

function formatAttachmentCount(count: number) {
  return t({
    en: `${count} ${count === 1 ? 'attachment' : 'attachments'}`,
    zh: `${count} 个附件`
  })
}
</script>

<template>
  <UIFormModal
    :key="model.activeFormSource.value ?? 'closed'"
    :radar="{ name: 'Feedback form', desc: 'Send feedback to the XBuilder team' }"
    :mask-closable="!isSubmitting"
    :title="$t({ en: 'Send feedback', zh: '提交反馈' })"
    :visible="model.activeFormSource.value != null"
    @update:visible="model.closeFeedbackForm"
  >
    <FeedbackForm
      v-if="model.activeFormSource.value != null"
      :source="model.activeFormSource.value"
      :draft="model.data.drafts[model.activeFormSource.value]"
      :submitting="isSubmitting"
      @cancel="model.closeFeedbackForm"
      @submit="handleSubmit"
    />
  </UIFormModal>

  <UIModal
    :visible="model.notificationCenterOpen.value"
    size="small"
    class="w-[520px]"
    :aria-labelledby="notificationTitleID"
    :radar="{ name: 'Notifications', desc: 'Notifications from the XBuilder support team' }"
    @update:visible="model.notificationCenterOpen.value = $event"
  >
    <div class="overflow-hidden">
      <Transition :name="notificationTransition" mode="out-in">
        <div v-if="selectedNotification == null" key="notification-list">
          <div class="flex items-center justify-between border-b border-grey-400 px-5 py-4">
            <h2 :id="notificationTitleID" class="font-semibold text-title">
              {{ $t({ en: 'Notifications', zh: '通知' }) }}
            </h2>
            <UIButton
              v-radar="{ name: 'Close notifications', desc: 'Close notifications' }"
              :aria-label="$t({ en: 'Close notifications', zh: '关闭通知' })"
              type="white"
              shape="square"
              size="small"
              icon="close"
              @click="model.notificationCenterOpen.value = false"
            />
          </div>

          <div v-if="model.data.notifications.length === 0" class="px-5 py-12 text-center text-sm text-grey-800">
            {{ $t({ en: 'No notifications', zh: '暂无通知' }) }}
          </div>
          <div v-else class="max-h-[480px] overflow-y-auto">
            <button
              v-for="notification in model.data.notifications"
              :key="notification.id"
              v-radar="{
                name: 'Support notification',
                desc: notification.readAt == null ? 'Unread reply from XBuilder Support' : 'Reply from XBuilder Support'
              }"
              class="block w-full appearance-none cursor-pointer border-x-0 border-t-0 border-b border-grey-300 px-5 py-4 text-left shadow-none transition-colors last:border-b-0 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-primary-main"
              :class="
                notification.readAt == null
                  ? 'bg-primary-100/60 hover:bg-primary-200 active:bg-primary-300'
                  : 'bg-transparent hover:bg-grey-200 active:bg-grey-300'
              "
              @click="openNotification(notification)"
            >
              <div class="flex items-start gap-3">
                <span
                  class="mt-1.5 size-2 shrink-0 rounded-full"
                  :class="notification.readAt == null ? 'bg-primary-main' : 'bg-transparent'"
                ></span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-3">
                    <span
                      class="truncate text-sm text-title"
                      :class="notification.readAt == null ? 'font-semibold' : 'font-normal'"
                    >
                      {{ notification.title }}
                    </span>
                    <time class="shrink-0 text-xs text-grey-800">{{ formatTime(notification.createdAt) }}</time>
                  </div>
                  <p class="mt-1 truncate text-sm text-grey-900">{{ notification.body }}</p>
                  <div
                    v-if="notification.attachments.length > 0"
                    class="mt-2 flex items-center gap-1 text-xs text-grey-800"
                  >
                    <UIIcon type="file" class="size-3" />
                    {{ formatAttachmentCount(notification.attachments.length) }}
                  </div>
                </div>
                <UIIcon type="arrowRightSmall" class="mt-1 size-4 shrink-0 text-grey-600" />
              </div>
            </button>
          </div>
        </div>

        <div v-else key="notification-detail">
          <div class="flex items-center justify-between border-b border-grey-400 px-4 py-4">
            <div class="flex min-w-0 items-center gap-2">
              <UIButton
                v-radar="{ name: 'Back to notifications', desc: 'Return to the notification list' }"
                :aria-label="$t({ en: 'Back to notifications', zh: '返回通知' })"
                type="white"
                shape="square"
                size="small"
                @click="backToNotificationList"
              >
                <template #icon>
                  <UIIcon type="arrowRightSmall" class="size-3.5 rotate-180" />
                </template>
              </UIButton>
              <h2
                :id="notificationTitleID"
                class="truncate font-semibold text-title"
                :title="selectedNotification.title"
              >
                {{ selectedNotification.title }}
              </h2>
            </div>
            <UIButton
              v-radar="{ name: 'Close notification detail', desc: 'Close notifications' }"
              :aria-label="$t({ en: 'Close notifications', zh: '关闭通知' })"
              type="white"
              shape="square"
              size="small"
              icon="close"
              @click="model.notificationCenterOpen.value = false"
            />
          </div>

          <article class="max-h-[480px] overflow-y-auto px-5 py-5">
            <p class="whitespace-pre-wrap text-sm leading-6 text-grey-1000">{{ selectedNotification.body }}</p>

            <section v-if="selectedNotification.attachments.length > 0" class="mt-6">
              <h4 class="text-sm font-semibold text-title">{{ $t({ en: 'Attachments', zh: '附件' }) }}</h4>
              <div class="mt-2 space-y-2">
                <div
                  v-for="attachment in selectedNotification.attachments"
                  :key="attachment.id"
                  class="flex items-center gap-3 rounded-lg border border-grey-400 bg-grey-100 px-3 py-3"
                >
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-grey-300 text-grey-900">
                    <UIIcon type="file" class="size-4" />
                  </span>
                  <div class="min-w-0">
                    <a
                      v-if="attachment.url != null"
                      class="block truncate text-sm font-medium text-title hover:text-primary-main"
                      :href="attachment.url"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ attachment.name }}
                    </a>
                    <p v-else class="truncate text-sm font-medium text-title">{{ attachment.name }}</p>
                    <p class="mt-0.5 text-xs text-grey-800">{{ formatFileSize(attachment.size) }}</p>
                  </div>
                </div>
              </div>
            </section>
          </article>
        </div>
      </Transition>
    </div>
  </UIModal>
</template>

<style scoped>
.notification-forward-enter-active,
.notification-forward-leave-active,
.notification-back-enter-active,
.notification-back-leave-active {
  transition:
    opacity 160ms ease,
    transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}

.notification-forward-enter-from,
.notification-back-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.notification-forward-leave-to,
.notification-back-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

@media (prefers-reduced-motion: reduce) {
  .notification-forward-enter-active,
  .notification-forward-leave-active,
  .notification-back-enter-active,
  .notification-back-leave-active {
    transition: opacity 120ms ease;
  }

  .notification-forward-enter-from,
  .notification-forward-leave-to,
  .notification-back-enter-from,
  .notification-back-leave-to {
    transform: none;
  }
}
</style>
