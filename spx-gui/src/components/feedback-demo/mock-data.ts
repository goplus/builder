import type { FeedbackContext } from './context'

import feedbackDemoImageUrl from './assets/xbuilder-loading-screen.jpg'

export type FeedbackSource = 'globalForm'
export type FeedbackStatus = 'new' | 'handled' | 'replied'
export type { FeedbackContext } from './context'

export const feedbackDemoMockVersion = 14

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
  repliedAt: string | null
  context?: FeedbackContext
}

export interface InProductNotification {
  id: string
  userID: string
  feedbackID: string
  title: string
  body: string
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
  systemNotifications: InProductNotification[]
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
      attachments: [
        {
          id: 'attachment-1002-1',
          name: 'xbuilder-loading-screen.jpg',
          size: 169_249,
          url: feedbackDemoImageUrl
        }
      ],
      createdAt: '2026-08-03T09:25:00+08:00',
      handledAt: null,
      reply: null,
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
      repliedAt: '2026-08-02T16:32:00+08:00'
    }
  ],
  notifications: [
    {
      id: 'notification-1009',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1002',
      title: '加载界面问题已定位',
      body: '我们根据你提交的截图定位了问题，请按回复中的建议修改后重试。',
      createdAt: '2026-08-10T10:18:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1008',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1008',
      title: '素材上传问题已修复',
      body: '现在可以重新上传角色图片，我们也优化了失败提示。',
      createdAt: '2026-08-09T15:42:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1007',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1007',
      title: '运行速度问题已优化',
      body: '我们减少了首次运行时的资源加载时间，请再试一次。',
      createdAt: '2026-08-08T13:25:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1006',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1006',
      title: '声音播放问题已处理',
      body: '循环播放声音时的中断问题已经修复。',
      createdAt: '2026-08-07T11:08:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1005',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1005',
      title: '代码提示问题已修复',
      body: '补全列表现在会正确显示项目中的角色名称。',
      createdAt: '2026-08-06T16:50:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1004',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1004',
      title: '作品封面问题已处理',
      body: '重新发布后，作品页会显示最新封面。',
      createdAt: '2026-08-05T14:36:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1003',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1003',
      title: '角色动画问题已修复',
      body: '切换造型时的闪烁问题已经处理。',
      createdAt: '2026-08-04T12:20:00+08:00',
      readAt: '2026-08-04T12:45:00+08:00'
    },
    {
      id: 'notification-1002',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1002',
      title: '加载界面问题已定位',
      body: '问题与一条无效指令有关，请按回复中的建议修改后重试。',
      createdAt: '2026-08-03T10:05:00+08:00',
      readAt: '2026-08-03T10:30:00+08:00'
    },
    {
      id: 'notification-1001',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1001',
      title: '支持团队回复了你的反馈',
      body: '发布页面的问题已经修复，请重新发布项目后再试一次。',
      createdAt: '2026-08-02T16:32:00+08:00',
      readAt: '2026-08-02T17:00:00+08:00'
    }
  ],
  systemNotifications: [
    {
      id: 'system-v1-6-release',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: 'XBuilder 新版本 V1.6 已发布',
      body: '我们完成了编辑器性能优化与多项功能升级，新增素材批量上传、项目加载加速及运行稳定性改进。',
      createdAt: '2026-09-07T18:00:00+08:00',
      readAt: null
    },
    {
      id: 'system-maintenance-2026-09-07',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '系统维护通知',
      body: '为提升服务稳定性，XBuilder 将于9月7日晚 23:00–24:00 进行系统维护。维护期间部分功能可能暂时无法使用，请提前保存项目，感谢你的理解与支持。',
      createdAt: '2026-09-07T12:00:00+08:00',
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
      context: feedback.context == null ? undefined : cloneFeedbackContext(feedback.context)
    })),
    notifications: mockData.notifications.map((notification) => ({ ...notification })),
    systemNotifications: mockData.systemNotifications.map((notification) => ({ ...notification }))
  }
}
