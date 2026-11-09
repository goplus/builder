import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setupPageTests, mountPages, makeFeedback, signIn } from '@/apps/xbuilder/pages/test'
import { cloudHelpers, saveFile, selectFilesWithUploadLimit } from '@/models/common/cloud'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { FeedbackStatus, type Feedback } from '@/apis/feedback'
import * as feedbackAdminApis from '@/apis/admin/feedback'

vi.mock('@/models/common/cloud', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/models/common/cloud')>()),
  saveFile: vi.fn(),
  selectFilesWithUploadLimit: vi.fn()
}))

describe('admin feedback', () => {
  setupPageTests()

  it('lists new feedback and marks it as no reply needed', async () => {
    await signIn({ canManageFeedback: true })
    let feedback = makeFeedback({
      context: {
        source: 'profileMenu',
        page: { path: '/editor/alice/space', language: 'en' },
        project: { identifier: null, displayName: 'Space' },
        diagnostics: [{ file: 'Rocket.spx', severity: 'error', line: 1, message: 'undefined: move' }],
        runtimeOutputs: [
          { time: '2026-01-02T00:00:00Z', kind: 'error', file: null, line: null, message: 'Rocket panicked' }
        ]
      }
    })
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
    expect(wrapper.text()).toContain('Space (unsaved)')
    const details = wrapper.findAll('details')
    expect(details.map((d) => d.get('summary').text())).toEqual([
      'Code errors and warnings (1)',
      'Runtime output (1)',
      'View raw data'
    ])
    expect(details.every((d) => !(d.element as HTMLDetailsElement).open)).toBe(true)
    expect(details[0].text()).toContain('undefined: move')
    expect(details[1].text()).toContain('Rocket panicked')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Mark as no reply needed')!
      .trigger('click')
    await vi.waitFor(() =>
      expect(feedbackAdminApis.updateFeedback).toHaveBeenCalledWith('1', { status: FeedbackStatus.Handled })
    )
    await vi.waitFor(() => expect(wrapper.text()).toContain('No reply needed'))
    expect(wrapper.findAll('button').some((b) => b.text() === 'Mark as no reply needed')).toBe(false)
    expect(wrapper.find('[aria-label="Reply content input"] textarea').exists()).toBe(false)
    expect(feedbackAdminApis.createFeedbackReply).not.toHaveBeenCalled()
  })

  it('replies to feedback with images', async () => {
    await signIn({ canManageFeedback: true })
    const reply = {
      content: 'Fixed in the next release.',
      attachments: [{ name: 'fix.png', url: 'kodo://test/fix.png' }],
      createdAt: '2026-01-03T00:00:00Z'
    }
    vi.mocked(feedbackAdminApis.getFeedback)
      .mockResolvedValueOnce(makeFeedback())
      .mockResolvedValue(makeFeedback({ status: FeedbackStatus.Replied, reply }))
    vi.mocked(feedbackAdminApis.createFeedbackReply).mockResolvedValue(reply)
    vi.mocked(selectFilesWithUploadLimit).mockResolvedValueOnce([new File(['image'], 'fix.png', { type: 'image/png' })])
    vi.mocked(saveFile).mockResolvedValueOnce('kodo://test/fix.png')
    vi.spyOn(cloudHelpers, 'universalUrlToWebUrl').mockImplementation(async (url) =>
      url.replace('kodo://test/', 'https://assets.test/')
    )

    const { wrapper } = await mountPages('/admin/feedback/1')
    const findButton = (text: string) => wrapper.findAll('button').find((button) => button.text() === text)
    await vi.waitFor(() => expect(findButton('Send reply')).toBeDefined())

    await findButton('Add images')!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('img[alt="fix.png"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Reply content input"] textarea').setValue('  Fixed in the next release.  ')
    await findButton('Send reply')!.trigger('click')

    await vi.waitFor(() =>
      expect(feedbackAdminApis.createFeedbackReply).toHaveBeenCalledWith('1', {
        content: 'Fixed in the next release.',
        attachments: [{ name: 'fix.png', url: 'kodo://test/fix.png' }]
      })
    )
    await vi.waitFor(() => expect(wrapper.find('a[href="https://assets.test/fix.png"]').exists()).toBe(true))
    expect(wrapper.text()).toContain('Fixed in the next release.')
    expect(findButton('Send reply')).toBeUndefined()
  })

  it('keeps the reply draft when sending fails', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback)
      .mockResolvedValueOnce(makeFeedback())
      .mockRejectedValue(new Error('offline'))
    vi.mocked(feedbackAdminApis.createFeedbackReply).mockRejectedValue(new Error('offline'))

    const { wrapper } = await mountPages('/admin/feedback/1')
    const getContentInput = () => wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    await (await vi.waitFor(getContentInput)).setValue('Fixed in the next release.')
    await wrapper.get('[aria-label="Send reply button"]').trigger('click')

    await vi.waitFor(() => expect(document.body.textContent).toContain('Failed to send reply'))
    await flushPromises()
    expect(getContentInput().element.value).toBe('Fixed in the next release.')
    expect(feedbackAdminApis.getFeedback).toHaveBeenCalledTimes(1)
  })

  it('validates reply content before sending', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(makeFeedback())

    const { wrapper } = await mountPages('/admin/feedback/1')
    const sendReply = await vi.waitFor(() => wrapper.get('[aria-label="Send reply button"]'))
    await sendReply.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('The reply must not be blank'))

    const maxLength = feedbackAdminApis.feedbackReplyContentMaxLength
    await wrapper.get('[aria-label="Reply content input"] textarea').setValue('a'.repeat(maxLength + 1))
    await sendReply.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain(`The reply must be ${maxLength} characters or fewer`))
    expect(feedbackAdminApis.createFeedbackReply).not.toHaveBeenCalled()
  })

  it('only attaches images to replies', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(makeFeedback())
    vi.mocked(selectFilesWithUploadLimit).mockResolvedValueOnce([
      new File(['notes'], 'notes.txt', { type: 'text/plain' })
    ])

    const { wrapper } = await mountPages('/admin/feedback/1')
    const addImages = await vi.waitFor(() => wrapper.get('[aria-label="Add reply images button"]'))
    await addImages.trigger('click')

    await vi.waitFor(() => expect(document.body.textContent).toContain('Only images can be attached'))
    expect(wrapper.find('img[alt="notes.txt"]').exists()).toBe(false)
  })

  it('shows the latest status when another admin handled the feedback first', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback)
      .mockResolvedValueOnce(makeFeedback())
      .mockResolvedValue(makeFeedback({ status: FeedbackStatus.Handled }))
    vi.mocked(feedbackAdminApis.updateFeedback).mockRejectedValue(
      new ApiException(ApiExceptionCode.errorConflict, 'feedback already handled', {
        req: new Request('http://localhost/api/admin/feedback/1', { method: 'PATCH' })
      })
    )

    const { wrapper } = await mountPages('/admin/feedback/1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Mark as no reply needed'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Mark as no reply needed')!
      .trigger('click')
    await vi.waitFor(() => expect(document.body.textContent).toContain('This feedback has already been processed'))
    await vi.waitFor(() =>
      expect(wrapper.findAll('button').some((b) => b.text() === 'Mark as no reply needed')).toBe(false)
    )
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

  it('shows malformed page state as raw data', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(
      makeFeedback({ context: { page: { toString: 0 }, diagnostics: [null] } })
    )

    const { wrapper } = await mountPages('/admin/feedback/1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('After I renamed the sprite'))
    expect(wrapper.text()).toContain('Mark as no reply needed')
    expect(wrapper.text()).toContain('The page state has an unrecognized format.')
    expect(wrapper.text()).toContain('"toString": 0')
  })

  it('does not mark feedback again while loading its new status', async () => {
    await signIn({ canManageFeedback: true })
    let resolveReload: (feedback: Feedback) => void = () => {}
    vi.mocked(feedbackAdminApis.getFeedback)
      .mockResolvedValueOnce(makeFeedback())
      .mockImplementationOnce(() => new Promise((resolve) => (resolveReload = resolve)))
    vi.mocked(feedbackAdminApis.updateFeedback).mockResolvedValue(makeFeedback({ status: FeedbackStatus.Handled }))

    const { wrapper } = await mountPages('/admin/feedback/1')
    const findMarkButton = () => wrapper.findAll('button').find((button) => button.text() === 'Mark as no reply needed')
    await vi.waitFor(() => expect(findMarkButton()).toBeDefined())
    await findMarkButton()!.trigger('click')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Marked as no reply needed'))
    expect(findMarkButton()).toBeUndefined()

    resolveReload(makeFeedback({ status: FeedbackStatus.Handled }))
    await vi.waitFor(() => expect(wrapper.text()).toContain('No reply needed'))
    expect(findMarkButton()).toBeUndefined()
    expect(feedbackAdminApis.updateFeedback).toHaveBeenCalledTimes(1)
  })

  it('opens the project snapshot shared with the feedback', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(
      makeFeedback({
        context: {
          source: 'profileMenu',
          page: { path: '/editor/alice/space', language: 'en' },
          projectSnapshotUrl: 'kodo://test/files/project-snapshot.json'
        }
      })
    )

    const { wrapper, router } = await mountPages('/admin/feedback/1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('After I renamed the sprite'))
    await wrapper.get('[aria-label="Open project snapshot"]').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.path).toMatch(/^\/admin\/feedback\/1\/project-snapshot/))
  })

  it('shows that the user did not share page state', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(makeFeedback())

    const { wrapper } = await mountPages('/admin/feedback/1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('The user did not share page state.'))
  })
})
