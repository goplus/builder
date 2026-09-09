<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import {
  UIButton,
  UIEmpty,
  UIFormModal,
  UIIcon,
  UIModal,
  UIModalClose,
  UIPagination,
  useMessage
} from '@/components/ui'
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
import xbuilderNotificationIcon from '@/components/ui/icons/xbuilder-notification.svg'
import notificationAttachmentIcon from '@/components/ui/icons/notification-attachment.svg'
import notificationAssociationArrow from '@/components/ui/icons/notification-association-arrow.svg'

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
const imagePreviewTitleID = useId()
type RenderableFeedbackAttachment = FeedbackAttachment & { url: string }
const selectedPreviewAttachment = ref<RenderableFeedbackAttachment | null>(null)
const previewAttachments = ref<RenderableFeedbackAttachment[]>([])
const previewPage = ref(1)
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
const selectedSystemNotification = computed(() =>
  selectedNotification.value?.feedbackID === '' ? selectedNotification.value : null
)
const selectedNotificationFeedback = computed(() => {
  const notification = selectedNotification.value
  return notification == null
    ? null
    : model.data.feedbacks.find((feedback) => feedback.id === notification.feedbackID) ?? null
})
const notificationImageAttachmentsMap = computed(() => {
  const attachmentsMap = new Map<string, RenderableFeedbackAttachment[]>()
  for (const feedback of model.data.feedbacks) {
    attachmentsMap.set(feedback.id, feedback.attachments.filter(isRenderableImageAttachment))
  }
  return attachmentsMap
})
const selectedNotificationImageAttachments = computed(
  () => notificationImageAttachmentsMap.value.get(selectedNotification.value?.feedbackID ?? '') ?? []
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
  if (!open) {
    selectedNotificationID.value = null
    selectedPreviewAttachment.value = null
    previewAttachments.value = []
    previewPage.value = 1
  }
  if (open) {
    activeNotificationTab.value = 'feedback'
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
  previewAttachments.value = []
  previewPage.value = 1
  selectedNotificationID.value = notification.id
  model.markNotificationRead(notification.id)
}

function backToNotificationList() {
  selectedPreviewAttachment.value = null
  previewAttachments.value = []
  previewPage.value = 1
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

function formatImageCount(count: number) {
  return t({
    en: `${count} image${count === 1 ? '' : 's'}`,
    zh: `${count} 张图片`
  })
}

function formatUnreadCount(count: number) {
  return count > 99 ? '99+' : String(count)
}

const imageFileExtensionPattern = /\.(apng|avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i

function isRenderableImageAttachment(attachment: FeedbackAttachment): attachment is RenderableFeedbackAttachment {
  if (attachment.url == null || attachment.url.trim() === '') return false
  if (attachment.url.startsWith('blob:') || attachment.url.startsWith('data:image/')) return true
  return imageFileExtensionPattern.test(attachment.name) || imageFileExtensionPattern.test(attachment.url)
}

function getAttachmentPreviewAriaLabel(attachment: RenderableFeedbackAttachment) {
  return t({
    en: `Preview image: ${attachment.name}`,
    zh: `预览图片：${attachment.name}`
  })
}

function getAttachmentAlt(attachment: RenderableFeedbackAttachment) {
  return t({
    en: `Submitted feedback image: ${attachment.name}`,
    zh: `反馈提交图片：${attachment.name}`
  })
}

function openAttachmentPreview(attachment: RenderableFeedbackAttachment) {
  const attachments = selectedNotificationImageAttachments.value
  previewAttachments.value = attachments.length > 0 ? attachments : [attachment]
  previewPage.value = Math.max(1, previewAttachments.value.findIndex((item) => item.id === attachment.id) + 1)
  selectedPreviewAttachment.value = previewAttachments.value[previewPage.value - 1] ?? attachment
}

function handlePreviewPageChange(page: number) {
  previewPage.value = page
  selectedPreviewAttachment.value = previewAttachments.value[page - 1] ?? null
}

function closeAttachmentPreview() {
  selectedPreviewAttachment.value = null
  previewAttachments.value = []
  previewPage.value = 1
}

function handlePreviewVisibleChange(visible: boolean) {
  if (!visible) closeAttachmentPreview()
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
          class="border-0 bg-transparent text-sm text-primary-main transition-colors hover:text-primary-600 focus-visible:outline-2 focus-visible:outline-primary-main"
          @click="model.markAllNotificationsRead"
        >
          {{ $t({ en: 'Mark all as read', zh: '全部已读' }) }}
        </button>
      </div>

      <div class="flex shrink-0 gap-6 border-b border-grey-300 px-6">
        <button
          type="button"
          class="relative border-0 bg-transparent px-0 pb-3 pt-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary-main"
          :class="activeNotificationTab === 'feedback' ? 'text-primary-main' : 'text-grey-700'"
          @click="activeNotificationTab = 'feedback'"
        >
          {{ $t({ en: 'Messages', zh: '消息通知' }) }}
          <span
            v-if="unreadFeedbackCount > 0"
            class="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-100 px-1 text-sm font-normal leading-[18px] text-red-main tabular-nums"
          >
            {{ formatUnreadCount(unreadFeedbackCount) }}
          </span>
          <span
            v-if="activeNotificationTab === 'feedback'"
            class="absolute inset-x-0 bottom-0 h-0.5 bg-primary-main"
          ></span>
        </button>
        <button
          type="button"
          class="relative border-0 bg-transparent px-0 pb-3 pt-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary-main"
          :class="activeNotificationTab === 'system' ? 'text-primary-main' : 'text-grey-700'"
          @click="activeNotificationTab = 'system'"
        >
          {{ $t({ en: 'System messages', zh: '系统消息' }) }}
          <span
            v-if="unreadSystemCount > 0"
            class="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-100 px-1 text-sm font-normal leading-[18px] text-red-main tabular-nums"
          >
            {{ formatUnreadCount(unreadSystemCount) }}
          </span>
          <span
            v-if="activeNotificationTab === 'system'"
            class="absolute inset-x-0 bottom-0 h-0.5 bg-primary-main"
          ></span>
        </button>
      </div>

      <div v-if="activeNotifications.length === 0" class="flex min-h-0 flex-1 items-center justify-center">
        <UIEmpty size="large" img="document" class="text-sm">
          {{ $t({ en: 'No notifications', zh: '暂无信息' }) }}
        </UIEmpty>
      </div>
      <div v-else class="min-h-0 flex-1 overflow-y-auto p-3">
        <button
          v-for="notification in activeNotifications"
          :key="notification.id"
          v-radar="{
            name: 'Support notification',
            desc: notification.readAt == null ? 'Unread reply from XBuilder Support' : 'Reply from XBuilder Support'
          }"
          class="group relative block w-full cursor-pointer rounded-lg border-0 bg-white p-3 text-left transition-colors hover:bg-grey-300 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-primary-main"
          :class="notification.readAt == null ? 'bg-white' : 'bg-white'"
          @click="openNotification(notification)"
        >
          <div class="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-3">
            <span class="relative flex size-10 shrink-0 items-center justify-center">
              <span
                v-if="notification.readAt == null"
                aria-hidden="true"
                class="absolute left-0 top-0 size-2 rounded-full bg-[#ef4149]"
              ></span>
              <img class="size-6" :src="xbuilderNotificationIcon" alt="" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <div class="flex items-start justify-between gap-3">
                <span class="min-w-0 flex-1 truncate text-[14px] leading-[22px] text-title font-normal">
                  {{ notification.title }}
                </span>
                <time class="shrink-0 text-[12px] leading-[18px] text-grey-700">{{
                  formatTime(notification.createdAt)
                }}</time>
              </div>
              <p class="mt-1 line-clamp-2 text-[12px] leading-[18px] text-grey-800">{{ notification.body }}</p>
            </div>
          </div>
        </button>
      </div>
    </div>

    <div v-else-if="selectedSystemNotification != null" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center gap-2 border-b border-grey-300 px-4 py-3">
        <UIButton
          :aria-label="$t({ en: 'Back to notifications', zh: '返回通知' })"
          type="white"
          shape="square"
          size="medium"
          @click="backToNotificationList"
        >
          <template #icon><UIIcon type="arrowRightSmall" class="size-4 rotate-180" /></template>
        </UIButton>
        <h2 :id="notificationTitleID" class="truncate text-base font-normal text-title">
          {{ selectedSystemNotification.title }}
        </h2>
      </div>
      <article class="min-h-0 flex-1 overflow-y-auto p-6">
        <div class="flex items-start justify-between gap-3">
          <p class="text-[14px] text-primary-main">{{ $t({ en: 'System notice', zh: '系统消息' }) }}</p>
          <time class="shrink-0 text-[12px] leading-[18px] text-grey-700">{{
            formatTime(selectedSystemNotification.createdAt)
          }}</time>
        </div>
        <p class="mt-4 whitespace-pre-wrap text-[14px] leading-[22px] text-grey-1000">
          {{ selectedSystemNotification.body }}
        </p>
      </article>
    </div>
    <div v-else class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center gap-2 border-b border-grey-300 px-4 py-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIButton
            v-radar="{ name: 'Back to notifications', desc: 'Return to the notification list' }"
            :aria-label="$t({ en: 'Back to notifications', zh: '返回通知' })"
            type="white"
            shape="square"
            size="medium"
            @click="backToNotificationList"
          >
            <template #icon>
              <UIIcon type="arrowRightSmall" class="size-4 rotate-180" />
            </template>
          </UIButton>
          <h2
            :id="notificationTitleID"
            class="truncate text-base font-normal text-title"
            :title="selectedNotification.title"
          >
            {{ selectedNotification.title }}
          </h2>
        </div>
      </div>

      <article class="min-h-0 flex-1 overflow-y-auto p-3">
        <section class="rounded-lg bg-white px-3">
          <div class="flex items-start justify-between gap-3">
            <p class="text-[14px] font-normal leading-[22px] text-primary-main">
              {{ $t({ en: 'Support reply', zh: '支持回复' }) }}
            </p>
            <time class="shrink-0 text-[12px] leading-[18px] text-grey-700">{{
              formatTime(selectedNotification.createdAt)
            }}</time>
          </div>
          <p class="mt-3 whitespace-pre-wrap text-[14px] font-normal leading-[22px] text-grey-1000">
            {{ selectedNotification.body }}
          </p>
          <UIButton
            v-if="selectedNotificationImageAttachments.length > 0"
            type="white"
            size="small"
            class="mt-3"
            @click="openAttachmentPreview(selectedNotificationImageAttachments[0])"
          >
            <template #icon
              ><img class="size-[13px]" :src="notificationAttachmentIcon" alt="" aria-hidden="true"
            /></template>
            {{ $t({ en: 'View attachment', zh: '查看附件' }) }}
          </UIButton>
        </section>

        <section class="relative mt-5 flex gap-2 px-3">
          <div class="flex shrink-0 items-start justify-center pt-1">
            <img class="size-4" :src="notificationAssociationArrow" alt="" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1 rounded-lg bg-grey-300 p-3">
            <div class="flex items-start justify-between gap-3">
              <p class="text-[13px] font-normal leading-5 text-title">
                {{
                  selectedNotificationFeedback?.title ??
                  $t({ en: 'The original feedback is not available.', zh: '原始反馈暂不可用。' })
                }}
              </p>
              <time class="shrink-0 text-[12px] leading-[18px] text-grey-700">{{
                formatTime(selectedNotificationFeedback?.createdAt ?? selectedNotification.createdAt)
              }}</time>
            </div>
            <p
              v-if="selectedNotificationFeedback?.description != null"
              class="mt-1 whitespace-pre-wrap text-[12px] leading-[18px] text-grey-900"
            >
              {{ selectedNotificationFeedback.description }}
            </p>
            <UIButton
              v-if="selectedNotificationImageAttachments.length > 0"
              type="white"
              size="small"
              class="mt-2"
              @click="openAttachmentPreview(selectedNotificationImageAttachments[0])"
            >
              <template #icon
                ><img class="size-[13px]" :src="notificationAttachmentIcon" alt="" aria-hidden="true"
              /></template>
              {{ $t({ en: 'View attachment', zh: '查看附件' }) }}
            </UIButton>
          </div>
        </section>

        <template v-if="selectedNotificationImageAttachments.length > 1">
          <div class="mt-5 flex items-center justify-between gap-3">
            <h3 class="text-sm font-normal text-title">
              {{ $t({ en: 'Images you submitted', zh: '你提交的图片' }) }}
            </h3>
            <span class="text-xs text-grey-800">{{
              formatImageCount(selectedNotificationImageAttachments.length)
            }}</span>
          </div>
          <div class="mt-3 grid grid-cols-1 gap-3">
            <button
              v-for="attachment in selectedNotificationImageAttachments.slice(1)"
              :key="attachment.id"
              type="button"
              class="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-grey-300 bg-grey-100 text-left focus-visible:outline-2 focus-visible:outline-primary-main"
              :aria-label="getAttachmentPreviewAriaLabel(attachment)"
              @click="openAttachmentPreview(attachment)"
            >
              <img class="h-32 w-full object-contain" :src="attachment.url" :alt="getAttachmentAlt(attachment)" />
            </button>
          </div>
        </template>
      </article>
    </div>
  </UIModal>

  <UIModal
    :visible="selectedPreviewAttachment != null"
    size="large"
    class="w-[min(1040px,calc(100vw-2rem))]"
    :aria-labelledby="imagePreviewTitleID"
    :radar="{ name: 'Feedback image preview', desc: 'Previewing user-submitted feedback image' }"
    @update:visible="handlePreviewVisibleChange"
  >
    <div v-if="selectedPreviewAttachment != null" class="flex max-h-[calc(100vh-2rem)] min-h-[360px] flex-col">
      <div class="flex items-center justify-between gap-3 border-b border-grey-400 px-6 py-3.5">
        <div class="min-w-0">
          <h2 :id="imagePreviewTitleID" class="truncate text-sm font-normal leading-[22px] text-title">
            {{ selectedPreviewAttachment.name }}
          </h2>
        </div>
        <UIModalClose
          :aria-label="$t({ en: 'Close image preview', zh: '关闭图片预览' })"
          @click="closeAttachmentPreview"
        />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto bg-grey-100 p-6">
        <img
          class="block h-auto max-h-[calc(100vh-10rem)] w-full max-w-none rounded-lg object-contain"
          :src="selectedPreviewAttachment.url"
          :alt="getAttachmentAlt(selectedPreviewAttachment)"
        />
      </div>
      <UIPagination
        v-if="previewAttachments.length > 1"
        :current="previewPage"
        :total="previewAttachments.length"
        class="justify-center px-2 pb-10 pt-2.5"
        @update:current="handlePreviewPageChange"
      />
    </div>
  </UIModal>
</template>
