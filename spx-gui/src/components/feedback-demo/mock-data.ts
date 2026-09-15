import type { FeedbackContext } from './context'

import feedbackDemoImageUrl from './assets/xbuilder-loading-screen.jpg'

const releaseGuideUrl = new URL('./assets/release-guide.png', import.meta.url).href
const projectPageScreenshotUrl = new URL('./assets/xbuilder-project-page.png', import.meta.url).href

export type FeedbackSource = 'globalForm'
export type FeedbackStatus = 'new' | 'handled' | 'replied'
export type { FeedbackContext } from './context'

export const feedbackDemoMockVersion = 20

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
  content: string
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
      id: 'notification-1011',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1002',
      title: '发布流程问题已修复',
      content: `> **运行项目时一直卡在加载界面**
>
> 点击运行以后加载动画一直没有结束，刷新页面后还是一样。
>
> [xbuilder-loading-screen.jpg](${feedbackDemoImageUrl} "xbuilder-loading-screen.jpg")

发布流程中的状态提示已经优化，请重新发布项目确认效果。若还是不行，请参考下面的操作指引。

[xbuilder-project-page.png](${projectPageScreenshotUrl} "xbuilder-project-page.png")`,
      createdAt: '2026-09-10T09:40:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1010',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '林小满改编了你的项目',
      content: '林小满改编了你的项目 **AI-Town-2222**，并发布了作品 **森林车站的一天**。',
      createdAt: '2026-09-09T14:20:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1009',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '阿泽点赞了你的项目',
      content: '阿泽点赞了你的项目 **Match3**。',
      createdAt: '2026-09-07T10:18:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1008',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '南风关注了你',
      content: '南风关注了你。你发布新项目后，对方可以在关注动态中看到。',
      createdAt: '2026-09-03T15:42:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1007',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1007',
      title: '素材上传问题已修复',
      content: `> **上传角色图片后一直提示失败**
>
> PNG 和 JPG 都试过了，文件大小也没有超过限制。
>
> [xbuilder-loading-screen.jpg](${feedbackDemoImageUrl} "xbuilder-loading-screen.jpg")

角色图片上传失败的问题已经修复，现在可以重新上传素材。我们也补充了更清晰的失败提示。

[release-guide.png](${releaseGuideUrl} "release-guide.png")`,
      createdAt: '2026-08-26T13:25:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1006',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '星河改编了你的项目',
      content: '星河改编了你的项目 **Flappy Fish**，加入了新的关卡和计分规则。',
      createdAt: '2026-08-10T11:08:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1005',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '小柚点赞了你的项目',
      content: '小柚点赞了你的项目 **太空冒险**。',
      createdAt: '2026-07-10T16:50:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1004',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '木棉关注了你',
      content: '木棉关注了你。去看看对方正在创作的项目吧。',
      createdAt: '2026-05-10T14:36:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1003',
      userID: 'user-xiaoyu',
      feedbackID: 'feedback-1003',
      title: '角色动画问题已修复',
      content: `> **角色切换造型时会短暂消失**
>
> 连续播放跑步动画时，每次循环到第一帧都会闪一下。
>
> [xbuilder-loading-screen.jpg](${feedbackDemoImageUrl} "xbuilder-loading-screen.jpg")

切换造型时的闪烁问题已经处理。请重新打开项目并运行，确认角色动画是否连续。

[release-guide.png](${releaseGuideUrl} "release-guide.png")`,
      createdAt: '2026-03-10T12:20:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1002',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '可乐点赞了你的项目',
      content: '可乐点赞了你的项目 **AI-Town**。',
      createdAt: '2025-09-10T10:05:00+08:00',
      readAt: null
    },
    {
      id: 'notification-1001',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '远山改编了你的项目',
      content: '远山改编了你的项目 **Match3**，并制作了新的主题版本 **水果消消乐**。',
      createdAt: '2024-09-10T16:32:00+08:00',
      readAt: null
    }
  ],
  systemNotifications: [
    {
      id: 'system-v1-6-release',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: 'XBuilder 新版本 V1.6 已发布',
      content: '我们完成了编辑器性能优化与多项功能升级，新增素材批量上传、项目加载加速及运行稳定性改进。',
      createdAt: '2026-09-10T08:00:00+08:00',
      readAt: null
    },
    {
      id: 'system-maintenance-2026-09-07',
      userID: 'user-xiaoyu',
      feedbackID: '',
      title: '系统维护通知',
      content:
        '为提升服务稳定性，XBuilder 将于9月7日晚 23:00–24:00 进行系统维护。维护期间部分功能可能暂时无法使用，请提前保存项目，感谢你的理解与支持。',
      createdAt: '2026-09-08T12:00:00+08:00',
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
