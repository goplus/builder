import { computed, inject, provide, reactive, ref, watch, type InjectionKey } from 'vue'

import {
  createMockFeedbackDemoData,
  cloneFeedbackContext,
  feedbackDemoMockVersion,
  type FeedbackAttachment,
  type FeedbackContext,
  type FeedbackDraft,
  type FeedbackDemoData,
  type FeedbackSource
} from './mock-data'

export interface SubmitFeedbackInput {
  source: FeedbackSource
  title: string
  description: string
  attachments: FeedbackAttachment[]
  includeContext?: boolean
  context?: FeedbackContext
}

type FeedbackFormPrefill = Pick<FeedbackDraft, 'title' | 'description'>

function escapeMarkdownLabel(value: string) {
  return value.replace(/([\\[\]])/g, '\\$1')
}

function toMarkdownAttachment(attachment: FeedbackAttachment) {
  if (attachment.url == null) return null
  const name = escapeMarkdownLabel(attachment.name)
  const title = attachment.name.replace(/"/g, '\\"')
  return `[${name}](${attachment.url} "${title}")`
}

function toQuotedMarkdown(value: string) {
  return value
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}

function formatQuotedFeedbackTime(value: string) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(value))
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${getPart('year')}年${getPart('month')}月${getPart('day')}日 ${getPart('hour')}:${getPart('minute')}`
}

export interface NotificationCenterAnchor {
  top: number
  right: number
}

export function createFeedbackDemoModel(initialData = createMockFeedbackDemoData()) {
  const data = reactive<FeedbackDemoData>(initialData)
  const activeFormSource = ref<FeedbackSource | null>(null)
  const notificationCenterOpen = ref(false)
  const notificationCenterAnchor = ref<NotificationCenterAnchor | null>(null)
  const unreadNotificationCount = computed(
    () =>
      [...data.notifications, ...data.systemNotifications].filter((notification) => notification.readAt == null).length
  )

  function openFeedbackForm(source: FeedbackSource, prefill?: FeedbackFormPrefill) {
    if (prefill != null) {
      data.drafts[source].title = prefill.title
      data.drafts[source].description = prefill.description
    }
    activeFormSource.value = source
    notificationCenterOpen.value = false
  }

  function closeFeedbackForm() {
    activeFormSource.value = null
    // Clean up blob URLs from draft attachments
    for (const attachment of data.drafts.globalForm.attachments) {
      if (attachment.url?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.url)
      }
    }
    // Clear draft attachments and close any other attachment drafts that may be reused later
    data.drafts.globalForm.attachments = []
  }

  function openNotificationCenter(anchor?: NotificationCenterAnchor) {
    activeFormSource.value = null
    notificationCenterAnchor.value = anchor ?? null
    notificationCenterOpen.value = true
  }

  function closeNotificationCenter() {
    notificationCenterOpen.value = false
    notificationCenterAnchor.value = null
  }

  function updateNotificationCenterAnchor(anchor: NotificationCenterAnchor) {
    if (!notificationCenterOpen.value) return
    notificationCenterAnchor.value = anchor
  }

  function submitFeedback(input: SubmitFeedbackInput) {
    const title = input.title.trim()
    const description = input.description.trim()
    if (title === '' || description === '') throw new Error('Feedback title and description are required')

    const sequence = data.feedbacks.length + 1001
    const feedback = {
      id: `feedback-${sequence}`,
      userID: data.currentUser.id,
      userDisplayName: data.currentUser.displayName,
      source: input.source,
      status: 'new' as const,
      title,
      description,
      attachments: input.attachments.map((attachment) => ({ ...attachment })),
      createdAt: new Date().toISOString(),
      handledAt: null,
      reply: null,
      repliedAt: null,
      context:
        input.includeContext === false || input.context == null ? undefined : cloneFeedbackContext(input.context),
      includeContext: input.includeContext !== false
    }
    data.feedbacks.unshift(feedback)
    activeFormSource.value = null
    return feedback
  }

  function replyToFeedback(feedbackID: string, replyInput: string) {
    const feedback = data.feedbacks.find((item) => item.id === feedbackID)
    const reply = replyInput.trim()
    if (feedback == null || feedback.status !== 'new' || reply === '') return null

    const repliedAt = new Date().toISOString()
    feedback.status = 'replied'
    feedback.reply = reply
    feedback.repliedAt = repliedAt
    const quotedFeedback = [
      `${feedback.userDisplayName} 在 ${formatQuotedFeedbackTime(feedback.createdAt)} 写道：`,
      '',
      toQuotedMarkdown(feedback.description),
      ...feedback.attachments.flatMap((attachment) => {
        const link = toMarkdownAttachment(attachment)
        return link == null ? [] : ['>', `> ${link}`]
      })
    ].join('\n')
    data.notifications.unshift({
      id: `notification-${data.notifications.length + 1001}`,
      userID: feedback.userID,
      feedbackID: feedback.id,
      title: `回复：${feedback.title}`,
      content: `${reply}\n\n${quotedFeedback}`,
      createdAt: repliedAt,
      readAt: null
    })
    return feedback
  }

  function markFeedbackHandled(feedbackID: string) {
    const feedback = data.feedbacks.find((item) => item.id === feedbackID)
    if (feedback == null || feedback.status !== 'new') return null
    feedback.status = 'handled'
    feedback.handledAt = new Date().toISOString()
    return feedback
  }

  function markNotificationRead(notificationID: string) {
    const notification = [...data.notifications, ...data.systemNotifications].find((item) => item.id === notificationID)
    if (notification == null || notification.readAt != null) return
    notification.readAt = new Date().toISOString()
  }

  function markAllNotificationsRead() {
    const readAt = new Date().toISOString()
    for (const notification of [...data.notifications, ...data.systemNotifications]) {
      if (notification.readAt == null) notification.readAt = readAt
    }
  }

  function reset() {
    Object.assign(data, createMockFeedbackDemoData())
    activeFormSource.value = null
    notificationCenterOpen.value = false
    notificationCenterAnchor.value = null
  }

  return {
    data,
    activeFormSource,
    notificationCenterOpen,
    notificationCenterAnchor,
    unreadNotificationCount,
    openFeedbackForm,
    closeFeedbackForm,
    openNotificationCenter,
    closeNotificationCenter,
    updateNotificationCenterAnchor,
    submitFeedback,
    replyToFeedback,
    markFeedbackHandled,
    markNotificationRead,
    markAllNotificationsRead,
    reset
  }
}

export type FeedbackDemoModel = ReturnType<typeof createFeedbackDemoModel>

const feedbackDemoModelKey: InjectionKey<FeedbackDemoModel> = Symbol('feedback-demo-model')
const feedbackDemoStorageKey = 'builder-feedback-live-demo'

function loadStoredFeedbackDemoData() {
  try {
    const value = localStorage.getItem(feedbackDemoStorageKey)
    if (value == null) return null
    const stored = JSON.parse(value) as { version?: number; data?: FeedbackDemoData }
    return stored.version === feedbackDemoMockVersion && stored.data != null ? stored.data : null
  } catch {
    return null
  }
}

export function provideFeedbackDemoModel() {
  const model = createFeedbackDemoModel(loadStoredFeedbackDemoData() ?? createMockFeedbackDemoData())
  watch(
    model.data,
    (data) => {
      localStorage.setItem(feedbackDemoStorageKey, JSON.stringify({ version: feedbackDemoMockVersion, data }))
    },
    { deep: true }
  )
  provide(feedbackDemoModelKey, model)
  return model
}

export function useFeedbackDemoModel() {
  const model = inject(feedbackDemoModelKey)
  if (model == null) throw new Error('Feedback demo model is not provided')
  return model
}
