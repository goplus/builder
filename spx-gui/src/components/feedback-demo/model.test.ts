import { describe, expect, it } from 'vitest'

import { createFeedbackDemoModel } from './model'

describe('feedback demo model', () => {
  it('submits feedback from the global form', () => {
    const model = createFeedbackDemoModel()

    const feedback = model.submitFeedback({
      source: 'globalForm',
      title: '  New feedback  ',
      description: '  Something went wrong.  ',
      attachments: [{ id: 'attachment-new', name: 'error.png', size: 1024 }]
    })

    expect(feedback).toMatchObject({
      source: 'globalForm',
      title: 'New feedback',
      description: 'Something went wrong.',
      status: 'new',
      userDisplayName: '小宇'
    })
    expect(model.data.feedbacks[0].id).toBe(feedback.id)
  })

  it('opens a prefilled form without submitting feedback', () => {
    const model = createFeedbackDemoModel()
    const initialFeedbackCount = model.data.feedbacks.length

    model.openFeedbackForm('globalForm', {
      title: 'Project does not start',
      description: 'Running the project stays on the loading screen.'
    })

    expect(model.activeFormSource.value).toBe('globalForm')
    expect(model.data.drafts.globalForm).toMatchObject({
      title: 'Project does not start',
      description: 'Running the project stays on the loading screen.'
    })
    expect(model.data.feedbacks).toHaveLength(initialFeedbackCount)
  })

  it('stores an isolated context snapshot with the submission', () => {
    const model = createFeedbackDemoModel()
    const context = {
      version: 2 as const,
      capturedAt: '2026-08-04T10:00:00.000Z',
      page: { fullPath: '/editor/demo?mode=debug', language: 'zh' as const },
      project: {
        identifier: 'user/demo',
        type: 'game',
        displayName: 'Demo',
        content: {
          sprites: ['Hero'],
          sounds: [],
          backdrops: ['Room'],
          widgets: [],
          physicsEnabled: true
        }
      },
      code: {
        file: 'main.spx',
        cursor: { line: 4, column: 2 },
        sample: { lineCount: 12, sampledLines: { 4: 'onStart => {' } }
      },
      diagnostics: [{ file: 'main.spx', severity: 'error' as const, line: 4, message: 'Unknown name' }]
    }

    const feedback = model.submitFeedback({
      source: 'globalForm',
      title: 'Context test',
      description: 'Context should travel with the feedback.',
      attachments: [],
      context
    })

    expect(feedback.context).toEqual(context)
    context.page.fullPath = '/changed-after-submit'
    expect(feedback.context?.page.fullPath).toBe('/editor/demo?mode=debug')
  })

  it('does not store context when the user opts out', () => {
    const model = createFeedbackDemoModel()
    const context = {
      version: 2 as const,
      capturedAt: '2026-08-04T10:00:00.000Z',
      page: { fullPath: '/editor/demo', language: 'en' as const }
    }

    const feedback = model.submitFeedback({
      source: 'globalForm',
      title: 'No context test',
      description: 'Context should stay out of this submission.',
      attachments: [],
      includeContext: false,
      context
    })

    expect(feedback.context).toBeUndefined()
    expect(feedback.includeContext).toBe(false)
  })

  it('delivers an admin reply as one unread in-product notification', () => {
    const model = createFeedbackDemoModel()
    const newFeedback = model.data.feedbacks.find((feedback) => feedback.status === 'new')!
    const initialUnreadCount = model.unreadNotificationCount.value
    const initialReplyCount = model.data.notifications.filter(
      (notification) => notification.feedbackID === newFeedback.id
    ).length

    model.replyToFeedback(newFeedback.id, '  We fixed this for you.  ')

    expect(newFeedback).toMatchObject({
      status: 'replied',
      reply: 'We fixed this for you.'
    })
    expect(model.data.notifications[0]).toMatchObject({
      feedbackID: newFeedback.id,
      readAt: null
    })
    expect(model.data.notifications[0].content).toContain('> **运行项目时一直卡在加载界面**')
    expect(model.data.notifications[0].content).toContain(
      '> [xbuilder-loading-screen.jpg](/src/components/feedback-demo/assets/xbuilder-loading-screen.jpg "xbuilder-loading-screen.jpg")'
    )
    expect(model.data.notifications[0].content).toMatch(/\n\nWe fixed this for you\.$/)
    expect(model.unreadNotificationCount.value).toBe(initialUnreadCount + 1)

    expect(model.data.notifications.filter((notification) => notification.feedbackID === newFeedback.id)).toHaveLength(
      initialReplyCount + 1
    )

    model.replyToFeedback(newFeedback.id, 'A second reply')
    expect(model.data.notifications.filter((notification) => notification.feedbackID === newFeedback.id)).toHaveLength(
      initialReplyCount + 1
    )
  })

  it('marks new feedback as handled without notifying the user', () => {
    const model = createFeedbackDemoModel()
    const newFeedback = model.data.feedbacks.find((feedback) => feedback.status === 'new')!
    const initialNotificationCount = model.data.notifications.length

    model.markFeedbackHandled(newFeedback.id)

    expect(newFeedback.status).toBe('handled')
    expect(newFeedback.handledAt).not.toBeNull()
    expect(model.data.notifications).toHaveLength(initialNotificationCount)
  })

  it('marks a notification as read and restores mock data', () => {
    const model = createFeedbackDemoModel()
    const newFeedback = model.data.feedbacks.find((feedback) => feedback.status === 'new')!
    const initialUnreadCount = model.unreadNotificationCount.value
    model.replyToFeedback(newFeedback.id, 'Resolved')
    const notification = model.data.notifications[0]

    model.markNotificationRead(notification.id)
    expect(notification.readAt).not.toBeNull()
    expect(model.unreadNotificationCount.value).toBe(initialUnreadCount)

    model.reset()
    expect(model.data.feedbacks).toHaveLength(2)
    expect(model.data.notifications).toHaveLength(11)
    expect(model.data.feedbacks[0].status).toBe('new')
    expect(model.unreadNotificationCount.value).toBe(13)
  })

  it('stores image attachments on submitted feedback', () => {
    const model = createFeedbackDemoModel()
    const feedback = model.submitFeedback({
      source: 'globalForm',
      title: 'Image support',
      description: 'Screenshot attached',
      attachments: [{ id: 'attachment-1', name: 'screen.png', size: 1234, url: 'blob:mock' }]
    })

    expect(feedback.attachments[0]).toMatchObject({
      id: 'attachment-1',
      name: 'screen.png',
      size: 1234,
      url: 'blob:mock'
    })
  })

  it('keeps reply notification title stable when feedback has images', () => {
    const model = createFeedbackDemoModel()
    const feedback = model.submitFeedback({
      source: 'globalForm',
      title: 'Image support',
      description: 'Screenshot attached',
      attachments: [{ id: 'attachment-1', name: 'screen.png', size: 1234, url: 'blob:mock' }]
    })

    model.replyToFeedback(feedback.id, 'Thanks, please check the attached screenshot.')

    expect(model.data.notifications[0].title).toBe('支持团队回复了你的反馈')
    expect(model.data.notifications[0].content).toBe(`> **Image support**
>
> Screenshot attached
>
> [screen.png](blob:mock "screen.png")

Thanks, please check the attached screenshot.`)
  })

  it('keeps feedback notification content as one standard Markdown document', () => {
    const model = createFeedbackDemoModel()
    const feedbackReplies = model.data.notifications.filter((notification) => notification.feedbackID !== '')

    expect(feedbackReplies).toHaveLength(3)
    for (const notification of feedbackReplies) {
      expect(notification.content).toMatch(/^> /)
      expect(notification.content).toMatch(/\[[^\]]+\]\([^)]+\.(?:jpg|png)(?: "[^"]+")?\)/)
      expect(notification.content).not.toContain('![')
      expect(notification.content).not.toContain('<notification-attachment')
    }

    const releaseNotification = model.data.notifications.find((notification) => notification.id === 'notification-1011')
    expect(releaseNotification?.content.match(/^\[[^\]]+\]\([^)]+\)$/gm)).toHaveLength(1)
    expect(releaseNotification?.content.indexOf('运行项目时一直卡在加载界面')).toBeLessThan(
      releaseNotification?.content.indexOf('发布流程中的状态提示已经优化') ?? -1
    )
  })

  it('keeps message and announcement content independent from title and time metadata', () => {
    const model = createFeedbackDemoModel()
    const allNotifications = [...model.data.notifications, ...model.data.systemNotifications]

    expect(allNotifications.length).toBeGreaterThan(0)
    for (const notification of allNotifications) {
      expect(typeof notification.content).toBe('string')
      expect(notification.content.trim()).not.toBe('')
      expect(notification.title.trim()).not.toBe('')
      expect(notification.createdAt.trim()).not.toBe('')
      expect(notification.content).not.toContain(notification.createdAt)
      expect(notification.content).not.toContain('<notification-time')
    }
  })
})
