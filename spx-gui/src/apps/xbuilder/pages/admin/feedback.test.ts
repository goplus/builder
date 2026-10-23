import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { FeedbackStatus, type Feedback } from '@/apis/feedback'
import * as feedbackAdminApis from '@/apis/admin/feedback'

function makeFeedback(status: FeedbackStatus): Feedback {
  return {
    id: '1',
    owner: 'alice',
    title: 'Sprite stops moving',
    description: 'After I renamed the sprite, it no longer moves.',
    context: {
      source: 'profileMenu',
      page: { path: '/editor/alice/space', language: 'en' },
      diagnostics: [{ file: 'Rocket.spx', severity: 'error', line: 1, message: 'undefined: move' }],
      runtimeOutputs: [{ time: '2026-01-02T00:00:00Z', kind: 'error', message: 'Rocket panicked' }]
    },
    status,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z'
  }
}

describe('admin feedback', () => {
  setupPageTests()

  it('lists new feedback and marks it as handled', async () => {
    await signIn({ canManageFeedback: true })
    let feedback = makeFeedback(FeedbackStatus.New)
    vi.mocked(feedbackAdminApis.listFeedback).mockImplementation(async () => ({ total: 1, data: [feedback] }))
    vi.mocked(feedbackAdminApis.getFeedback).mockImplementation(async () => feedback)
    vi.mocked(feedbackAdminApis.updateFeedback).mockImplementation(async (_id, params) => {
      feedback = { ...feedback, ...params }
      return feedback
    })

    const { wrapper, router } = await mountPages('/admin')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/admin/feedback'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Sprite stops moving'))
    expect(feedbackAdminApis.listFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ status: FeedbackStatus.New, sortOrder: 'desc' })
    )

    await router.push('/admin/feedback/1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('After I renamed the sprite'))
    expect(wrapper.text()).toContain('undefined: move')
    expect(wrapper.text()).toContain('Rocket panicked')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Mark as handled')!
      .trigger('click')
    await vi.waitFor(() =>
      expect(feedbackAdminApis.updateFeedback).toHaveBeenCalledWith('1', { status: FeedbackStatus.Handled })
    )
    await vi.waitFor(() => expect(wrapper.text()).toContain('Handled'))
    expect(wrapper.findAll('button').some((b) => b.text() === 'Mark as handled')).toBe(false)
  })

  it('shows the latest status when another admin handled the feedback first', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback)
      .mockResolvedValueOnce(makeFeedback(FeedbackStatus.New))
      .mockResolvedValue(makeFeedback(FeedbackStatus.Handled))
    vi.mocked(feedbackAdminApis.updateFeedback).mockRejectedValue(
      new ApiException(ApiExceptionCode.errorConflict, 'feedback already handled', {
        req: new Request('http://localhost/api/admin/feedback/1', { method: 'PATCH' })
      })
    )

    const { wrapper } = await mountPages('/admin/feedback/1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Mark as handled'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Mark as handled')!
      .trigger('click')
    await vi.waitFor(() => expect(document.body.textContent).toContain('This feedback has already been handled'))
    await vi.waitFor(() => expect(wrapper.findAll('button').some((b) => b.text() === 'Mark as handled')).toBe(false))
    expect(feedbackAdminApis.getFeedback).toHaveBeenCalledTimes(2)
  })

  it('denies access to the list without the feedback admin capability', async () => {
    await signIn({ canManageAccount: true })

    const { wrapper } = await mountPages('/admin/feedback')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Access denied'))
    expect(feedbackAdminApis.listFeedback).not.toHaveBeenCalled()
  })

  it('denies access to details without the feedback admin capability', async () => {
    await signIn({ canManageAccount: true })

    const { wrapper } = await mountPages('/admin/feedback/1')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Access denied'))
    expect(feedbackAdminApis.getFeedback).not.toHaveBeenCalled()
  })

  it('shows malformed diagnostic information as raw data', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue({
      ...makeFeedback(FeedbackStatus.New),
      context: { page: { toString: 0 }, diagnostics: [null] }
    })

    const { wrapper } = await mountPages('/admin/feedback/1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('After I renamed the sprite'))
    expect(wrapper.text()).toContain('Mark as handled')
    expect(wrapper.text()).toContain('The diagnostic information has an unrecognized format.')
    expect(wrapper.text()).toContain('"toString": 0')
  })

  it('does not mark feedback again while loading its new status', async () => {
    await signIn({ canManageFeedback: true })
    let resolveReload: (feedback: Feedback) => void = () => {}
    vi.mocked(feedbackAdminApis.getFeedback)
      .mockResolvedValueOnce(makeFeedback(FeedbackStatus.New))
      .mockImplementationOnce(() => new Promise((resolve) => (resolveReload = resolve)))
    vi.mocked(feedbackAdminApis.updateFeedback).mockResolvedValue(makeFeedback(FeedbackStatus.Handled))

    const { wrapper } = await mountPages('/admin/feedback/1')
    const findMarkButton = () => wrapper.findAll('button').find((button) => button.text() === 'Mark as handled')
    await vi.waitFor(() => expect(findMarkButton()).toBeDefined())
    await findMarkButton()!.trigger('click')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Feedback marked as handled'))
    expect(findMarkButton()).toBeUndefined()

    resolveReload(makeFeedback(FeedbackStatus.Handled))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Handled'))
    expect(findMarkButton()).toBeUndefined()
    expect(feedbackAdminApis.updateFeedback).toHaveBeenCalledTimes(1)
  })

  it('shows that the user did not share diagnostic information', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue({
      ...makeFeedback(FeedbackStatus.New),
      context: undefined
    })

    const { wrapper } = await mountPages('/admin/feedback/1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('The user did not share diagnostic information.'))
  })
})
