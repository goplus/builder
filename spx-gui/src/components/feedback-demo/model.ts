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

export function createFeedbackDemoModel(initialData = createMockFeedbackDemoData()) {
  const data = reactive<FeedbackDemoData>(initialData)
  const activeFormSource = ref<FeedbackSource | null>(null)
  const notificationCenterOpen = ref(false)
  const unreadNotificationCount = computed(
    () => data.notifications.filter((notification) => notification.readAt == null).length
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
  }

  function openNotificationCenter() {
    activeFormSource.value = null
    notificationCenterOpen.value = true
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
      replyAttachments: [],
      repliedAt: null,
      context:
        input.includeContext === false || input.context == null ? undefined : cloneFeedbackContext(input.context),
      includeContext: input.includeContext !== false
    }
    data.feedbacks.unshift(feedback)
    activeFormSource.value = null
    return feedback
  }

  function replyToFeedback(feedbackID: string, replyInput: string, attachments: FeedbackAttachment[] = []) {
    const feedback = data.feedbacks.find((item) => item.id === feedbackID)
    const reply = replyInput.trim()
    if (feedback == null || feedback.status !== 'new' || reply === '') return null

    const repliedAt = new Date().toISOString()
    feedback.status = 'replied'
    feedback.reply = reply
    feedback.replyAttachments = attachments.map((attachment) => ({ ...attachment }))
    feedback.repliedAt = repliedAt
    data.notifications.unshift({
      id: `notification-${data.notifications.length + 1001}`,
      userID: feedback.userID,
      feedbackID: feedback.id,
      title: '支持团队回复了你的反馈',
      body: reply,
      attachments: attachments.map((attachment) => ({ ...attachment })),
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
    const notification = data.notifications.find((item) => item.id === notificationID)
    if (notification == null || notification.readAt != null) return
    notification.readAt = new Date().toISOString()
  }

  function reset() {
    Object.assign(data, createMockFeedbackDemoData())
    activeFormSource.value = null
    notificationCenterOpen.value = false
  }

  return {
    data,
    activeFormSource,
    notificationCenterOpen,
    unreadNotificationCount,
    openFeedbackForm,
    closeFeedbackForm,
    openNotificationCenter,
    submitFeedback,
    replyToFeedback,
    markFeedbackHandled,
    markNotificationRead,
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
