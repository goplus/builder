<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, nextTick, onMounted, onScopeDispose, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import { humanizeExactTime } from '@/utils/utils'
import { UIButton, UICardHeader, UIEmpty, UIFormModal, UIModal, UIModalClose, useMessage } from '@/components/ui'
import { useCopilot } from '@/components/copilot/context'
import { RoundState } from '@/components/copilot/copilot'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorRef } from '@/components/xgo-code-editor'
import { createPrepareFeedbackTool, type PreparedFeedbackDraft } from './copilot'
import { captureFeedbackContext } from './context'
import FeedbackForm from './FeedbackForm.vue'
import NotificationMarkdown from './NotificationMarkdown.vue'
import { useFeedbackDemoModel, type SubmitFeedbackInput } from './model'
import type { FeedbackAttachment, InProductNotification } from './mock-data'
import { captureViewport } from '@/components/screenshot/capture'
import notificationBackIcon from '@/components/ui/icons/angle-left.svg'

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
const activeNotificationTab = ref<'feedback' | 'system'>('feedback')
const notificationTitleID = useId()
const notificationListScrollRef = ref<HTMLElement | null>(null)
const notificationListHasScroll = ref(false)
const notificationListScrollbarWidth = ref(0)
const imagePreviewTitleID = useId()
const selectedPreviewAttachment = ref<{ name: string; url: string } | null>(null)
const feedbackNotifications = computed(() => model.data.notifications)
const systemNotifications = computed(() => model.data.systemNotifications)
const activeNotifications = computed(() =>
  activeNotificationTab.value === 'feedback' ? feedbackNotifications.value : systemNotifications.value
)
const unreadFeedbackCount = computed(
  () => feedbackNotifications.value.filter((notification) => notification.readAt == null).length
)
const unreadSystemCount = computed(
  () => systemNotifications.value.filter((notification) => notification.readAt == null).length
)
const selectedNotification = computed(
  () =>
    [...model.data.notifications, ...model.data.systemNotifications].find(
      (notification) => notification.id === selectedNotificationID.value
    ) ?? null
)

function updateNotificationListScrollState() {
  const element = notificationListScrollRef.value
  if (element == null) {
    notificationListHasScroll.value = false
    notificationListScrollbarWidth.value = 0
    return
  }
  notificationListHasScroll.value = element.scrollHeight > element.clientHeight + 1
  notificationListScrollbarWidth.value = notificationListHasScroll.value
    ? Math.max(0, element.offsetWidth - element.clientWidth)
    : 0
}

watch(
  [activeNotificationTab, activeNotifications, model.notificationCenterOpen],
  () => {
    void nextTick(updateNotificationListScrollState)
  },
  { deep: true, flush: 'post' }
)

onMounted(() => {
  const resizeObserver = new ResizeObserver(updateNotificationListScrollState)
  if (notificationListScrollRef.value != null) resizeObserver.observe(notificationListScrollRef.value)
  onScopeDispose(() => resizeObserver.disconnect())
})

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
  if (!open) {
    selectedNotificationID.value = null
    selectedPreviewAttachment.value = null
  }
  if (open) {
    activeNotificationTab.value = unreadFeedbackCount.value === 0 && unreadSystemCount.value > 0 ? 'system' : 'feedback'
  }
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
  selectedPreviewAttachment.value = null
  selectedNotificationID.value = notification.id
  model.markNotificationRead(notification.id)
}

function backToNotificationList() {
  selectedPreviewAttachment.value = null
  selectedNotificationID.value = null
}

function openAttachmentPreview(attachment: { name: string; url: string }) {
  selectedPreviewAttachment.value = attachment
}

function closeAttachmentPreview() {
  selectedPreviewAttachment.value = null
}

function handlePreviewVisibleChange(visible: boolean) {
  if (!visible) closeAttachmentPreview()
}

function formatTime(value: string) {
  return dayjs(value)
    .locale(i18n.lang.value === 'zh' ? 'zh' : 'en')
    .fromNow()
}

function formatExactTime(value: string) {
  return t(humanizeExactTime(value))
}

function formatUnreadCount(count: number) {
  return count > 99 ? '99+' : String(count)
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
    :mask="false"
    placement="top-right"
    :anchor="model.notificationCenterAnchor.value"
    class="h-[484px] w-[408px]"
    :aria-labelledby="notificationTitleID"
    :radar="{ name: 'Notifications', desc: 'Notifications from the XBuilder support team' }"
    @update:visible="model.notificationCenterOpen.value = $event"
  >
    <div v-if="selectedNotification == null" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
        <h2 :id="notificationTitleID" class="text-lg text-title">
          {{ $t({ en: 'Notifications', zh: '通知' }) }}
        </h2>
        <button
          v-radar="{ name: 'Mark all notifications read', desc: 'Mark all notifications as read' }"
          type="button"
          class="border-0 bg-transparent text-sm text-primary-main transition-colors enabled:hover:text-primary-600 disabled:cursor-default disabled:text-grey-600 focus-visible:outline-2 focus-visible:outline-primary-main"
          :disabled="model.unreadNotificationCount.value === 0"
          @click="model.markAllNotificationsRead"
        >
          {{ $t({ en: 'Mark all as read', zh: '全部已读' }) }}
        </button>
      </div>

      <div class="flex shrink-0 gap-6 border-b border-grey-300 px-6">
        <button
          type="button"
          class="relative border-0 bg-transparent px-0 pb-3 pt-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary-main"
          :class="activeNotificationTab === 'feedback' ? 'text-primary-main' : 'text-grey-800'"
          @click="activeNotificationTab = 'feedback'"
        >
          <span class="relative inline-block text-base">
            {{ $t({ en: 'Messages', zh: '消息' }) }}
            <span
              v-if="activeNotificationTab === 'feedback'"
              class="absolute inset-x-0 -bottom-[13px] h-0.5 bg-primary-main"
            ></span>
          </span>
          <span
            v-if="unreadFeedbackCount > 0"
            class="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-100 px-1 text-sm font-normal leading-[18px] text-red-main tabular-nums"
          >
            {{ formatUnreadCount(unreadFeedbackCount) }}
          </span>
        </button>
        <button
          type="button"
          class="relative border-0 bg-transparent px-0 pb-3 pt-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary-main"
          :class="activeNotificationTab === 'system' ? 'text-primary-main' : 'text-grey-800'"
          @click="activeNotificationTab = 'system'"
        >
          <span class="relative inline-block text-base">
            {{ $t({ en: 'Announcements', zh: '公告' }) }}
            <span
              v-if="activeNotificationTab === 'system'"
              class="absolute inset-x-0 -bottom-[13px] h-0.5 bg-primary-main"
            ></span>
          </span>
          <span
            v-if="unreadSystemCount > 0"
            class="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-100 px-1 text-sm font-normal leading-[18px] text-red-main tabular-nums"
          >
            {{ formatUnreadCount(unreadSystemCount) }}
          </span>
        </button>
      </div>

      <div v-if="activeNotifications.length === 0" class="flex min-h-0 flex-1 items-center justify-center">
        <UIEmpty size="large" img="document" class="text-sm">
          {{ $t({ en: 'No notifications', zh: '暂无信息' }) }}
        </UIEmpty>
      </div>
      <div v-else class="min-h-0 flex-1 p-3">
        <div
          ref="notificationListScrollRef"
          class="h-full overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2"
          :style="{
            width: notificationListHasScroll ? `calc(100% + ${notificationListScrollbarWidth}px)` : '100%'
          }"
        >
          <button
            v-for="notification in activeNotifications"
            :key="notification.id"
            v-radar="{
              name: 'Notification',
              desc: notification.readAt == null ? 'Unread notification' : 'Notification'
            }"
            class="group relative block w-full cursor-pointer rounded-lg border-0 bg-white p-3 text-left transition-colors hover:bg-grey-300 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-primary-main"
            :class="notification.readAt == null ? 'bg-white' : 'bg-white'"
            @click="openNotification(notification)"
          >
            <div class="min-w-0">
              <div class="flex items-start justify-between gap-3">
                <span class="flex min-w-0 flex-1 items-start gap-1">
                  <span class="min-w-0 truncate text-[14px] leading-[22px] text-title font-normal">
                    {{ notification.title }}
                  </span>
                  <span
                    v-if="notification.readAt == null"
                    aria-hidden="true"
                    class="mt-0.5 size-2 shrink-0 rounded-full bg-[#ef4149]"
                  ></span>
                </span>
                <time
                  class="shrink-0 text-[12px] leading-[18px] text-grey-700"
                  :datetime="notification.createdAt"
                  :title="formatExactTime(notification.createdAt)"
                  >{{ formatTime(notification.createdAt) }}</time
                >
              </div>
              <NotificationMarkdown class="mt-1" compact :value="notification.content" />
            </div>
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center gap-2 border-b border-grey-300 px-4 py-3">
        <UIButton
          v-radar="{ name: 'Back to notifications', desc: 'Return to the notification list' }"
          :aria-label="$t({ en: 'Back to notifications', zh: '返回通知' })"
          type="white"
          shape="square"
          size="medium"
          @click="backToNotificationList"
        >
          <template #icon>
            <img class="size-4" :src="notificationBackIcon" alt="" aria-hidden="true" />
          </template>
        </UIButton>
        <div class="min-w-0 flex-1">
          <h2
            :id="notificationTitleID"
            class="truncate text-base font-normal text-title"
            :title="selectedNotification.title"
          >
            {{ selectedNotification.title }}
          </h2>
        </div>
      </div>

      <article class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <NotificationMarkdown
          :value="selectedNotification.content"
          :time="formatTime(selectedNotification.createdAt)"
          :time-title="formatExactTime(selectedNotification.createdAt)"
          :time-value="selectedNotification.createdAt"
          @preview="openAttachmentPreview"
        />
      </article>
    </div>
  </UIModal>

  <UIModal
    :visible="selectedPreviewAttachment != null"
    size="large"
    class="w-[min(1040px,calc(100vw-2rem))]"
    :aria-labelledby="imagePreviewTitleID"
    :radar="{ name: 'Notification attachment preview', desc: 'Previewing an image attached to a notification' }"
    @update:visible="handlePreviewVisibleChange"
  >
    <div v-if="selectedPreviewAttachment != null" class="flex max-h-[calc(100vh-2rem)] min-h-[360px] flex-col">
      <UICardHeader class="h-auto min-h-10 justify-between gap-3 px-6 py-2 text-sm">
        <h2 :id="imagePreviewTitleID" class="min-w-0 truncate text-sm font-normal leading-[22px] text-title">
          {{ selectedPreviewAttachment.name }}
        </h2>
        <UIModalClose
          class="h-8 w-8 shrink-0"
          :aria-label="$t({ en: 'Close image preview', zh: '关闭图片预览' })"
          @click="closeAttachmentPreview"
        />
      </UICardHeader>
      <div class="min-h-0 flex flex-1 items-center justify-center overflow-y-auto bg-grey-100 p-6">
        <img
          class="block max-h-[calc(100vh-10rem)] max-w-full rounded-lg object-contain"
          :src="selectedPreviewAttachment.url"
          :alt="selectedPreviewAttachment.name"
        />
      </div>
    </div>
  </UIModal>
</template>
