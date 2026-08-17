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

    model.replyToFeedback(newFeedback.id, '  We fixed this for you.  ', [
      { id: 'reply-attachment', name: 'steps.pdf', size: 2048 }
    ])

    expect(newFeedback).toMatchObject({
      status: 'replied',
      reply: 'We fixed this for you.',
      replyAttachments: [{ id: 'reply-attachment', name: 'steps.pdf', size: 2048 }]
    })
    expect(model.data.notifications[0]).toMatchObject({
      feedbackID: newFeedback.id,
      body: 'We fixed this for you.',
      attachments: [{ id: 'reply-attachment', name: 'steps.pdf', size: 2048 }],
      readAt: null
    })
    expect(model.unreadNotificationCount.value).toBe(initialUnreadCount + 1)

    model.replyToFeedback(newFeedback.id, 'A second reply')
    expect(model.data.notifications.filter((notification) => notification.feedbackID === newFeedback.id)).toHaveLength(
      1
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
    expect(model.data.notifications).toHaveLength(1)
    expect(model.data.feedbacks[0].status).toBe('new')
    expect(model.unreadNotificationCount.value).toBe(1)
  })
})
