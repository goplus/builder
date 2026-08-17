import type { FeedbackContext } from './context'

export type FeedbackSource = 'globalForm'
export type FeedbackStatus = 'new' | 'handled' | 'replied'
export type { FeedbackContext } from './context'

export const feedbackDemoMockVersion = 10

export interface FeedbackAttachment {
  id: string
  name: string
  size: number
  url?: string
}

export interface FeedbackDraft {
  title: string
  description: string
  attachments: FeedbackAttachment[]
  includeContext?: boolean
}

export interface FeedbackSubmission extends FeedbackDraft {
  id: string
  userID: string
  userDisplayName: string
  source: FeedbackSource
  status: FeedbackStatus
  createdAt: string
  handledAt: string | null
  reply: string | null
  replyAttachments: FeedbackAttachment[]
  repliedAt: string | null
  context?: FeedbackContext
}

export interface InProductNotification {
  id: string
  userID: string
  feedbackID: string
  title: string
  body: string
  attachments: FeedbackAttachment[]
  createdAt: string
  readAt: string | null
}

export interface FeedbackDemoData {
  currentUser: {
    id: string
    displayName: string
  }
  drafts: Record<FeedbackSource, FeedbackDraft>
  feedbacks: FeedbackSubmission[]
  notifications: InProductNotification[]
}

const mockData: FeedbackDemoData = {
  currentUser: {
    id: 'user-xiaoyu',
    displayName: '小宇'
  },
  drafts: {
    globalForm: {
      title: '',
      description: '',
      attachments: [],
      includeContext: true
    }
  },
  feedbacks: [
    {
      id: 'feedback-1002',
      userID: 'user-xiaoyu',
      userDisplayName: '小宇',
      source: 'globalForm',
      status: 'new',
      title: '运行项目时一直卡在加载界面',
      description: '点击运行以后加载动画一直没有结束，刷新页面后还是一样。',
      attachments: [{ id: 'attachment-1002-1', name: 'loading-screen.png', size: 284_512 }],
      createdAt: '2026-08-03T09:25:00+08:00',
      handledAt: null,
      reply: null,
      replyAttachments: [],
      repliedAt: null,
      context: {
        version: 2,
        capturedAt: '2026-08-03T09:24:42+08:00',
        page: {
          fullPath: '/editor/xiaoyu/space-adventure?mode=debug',
          language: 'zh'
        },
        project: {
          identifier: 'xiaoyu/space-adventure',
          type: 'game',
          displayName: '太空冒险',
          content: {
            sprites: ['Hero', 'Meteor'],
            sounds: ['Jump', 'Explosion'],
            backdrops: ['Space'],
            widgets: ['Score'],
            physicsEnabled: true
          }
        },
        selectedSprite: {
          name: 'Hero',
          costumes: ['Idle', 'Jump'],
          animations: ['Run'],
          heading: 90,
          x: -120,
          y: 24,
          size: 80,
          rotationStyle: 'normal',
          visible: true,
          codeLinesNum: 42
        },
        code: {
          file: 'Hero.spx',
          cursor: { line: 8, column: 5 },
          sample: {
            lineCount: 42,
            sampledLines: {
              6: 'onStart => {',
              7: '    for {',
              8: '        step 4',
              9: '    }',
              10: '}'
            }
          }
        },
        diagnostics: [
          {
            file: 'Hero',
            severity: 'error',
            line: 8,
            message: 'Unknown command: step'
          }
        ],
        runtimeOutputs: [
          {
            time: '2026-08-03T09:24:38+08:00',
            kind: 'log',
            message: 'Game started'
          },
          {
            time: '2026-08-03T09:24:41+08:00',
            kind: 'error',
            file: 'Hero',
            line: 8,
            message: 'ReferenceError: step is not defined'
          }
        ]
      }
    },
    {
      id: 'feedback-1001',
      userID: 'user-xiaoyu',
      userDisplayName: '小宇',
      source: 'globalForm',
      status: 'replied',
      title: '发布后的项目打开为空白',
      description: '项目在编辑器里可以正常运行，但发布后打开页面是空白的。',
      attachments: [],
      createdAt: '2026-08-02T16:10:00+08:00',
      handledAt: null,
      reply: '发布页面的问题已经修复，请重新发布项目后再试一次。',
      replyAttachments: [{ id: 'reply-attachment-1001-1', name: '重新发布项目.pdf', size: 248_832 }],
      repliedAt: '2026-08-02T16:32:00+08:00'
    }
  ],
  notifications: [
    {
      id: 'notification-1001',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1001',
      title: '支持团队回复了你的反馈',
      body: '发布页面的问题已经修复，请重新发布项目后再试一次。',
      attachments: [{ id: 'reply-attachment-1001-1', name: '重新发布项目.pdf', size: 248_832 }],
      createdAt: '2026-08-02T16:32:00+08:00',
      readAt: null
    }
  ]
}

function cloneAttachments(attachments: FeedbackAttachment[]) {
  return attachments.map((attachment) => ({ ...attachment }))
}

export function cloneFeedbackContext(context: FeedbackContext): FeedbackContext {
  return JSON.parse(JSON.stringify(context)) as FeedbackContext
}

export function createMockFeedbackDemoData(): FeedbackDemoData {
  return {
    ...mockData,
    currentUser: { ...mockData.currentUser },
    drafts: {
      globalForm: {
        ...mockData.drafts.globalForm,
        attachments: cloneAttachments(mockData.drafts.globalForm.attachments)
      }
    },
    feedbacks: mockData.feedbacks.map((feedback) => ({
      ...feedback,
      attachments: cloneAttachments(feedback.attachments),
      replyAttachments: cloneAttachments(feedback.replyAttachments),
      context: feedback.context == null ? undefined : cloneFeedbackContext(feedback.context)
    })),
    notifications: mockData.notifications.map((notification) => ({
      ...notification,
      attachments: cloneAttachments(notification.attachments)
    }))
  }
}
