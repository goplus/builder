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

  it('inserts uploaded images at the cursor and sends a Markdown-only reply', async () => {
    await signIn({ canManageFeedback: true })
    const reply = {
      content: '**Before.**\n\n![fix.png](<kodo://test/fix.png>)\n\nAfter.',
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

    const input = wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    await input.setValue('Before.After.')
    input.element.setSelectionRange(7, 7)
    await findButton('Add images')!.trigger('click')
    await vi.waitFor(() => expect(input.element.value).toBe('Before.\n\n![fix.png](<kodo://test/fix.png>)\n\nAfter.'))
    await vi.waitFor(() => expect(input.element.readOnly).toBe(false))
    await input.setValue(`  ${reply.content}  `)
    await findButton('Send reply')!.trigger('click')

    await vi.waitFor(() =>
      expect(feedbackAdminApis.createFeedbackReply).toHaveBeenCalledWith('1', {
        content: reply.content
      })
    )
    // Markdown refers to the uploaded image, never an inline data URL.
    expect(saveFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'fix.png' }), { inlineable: false })
    await vi.waitFor(() => expect(wrapper.find('a[href="https://assets.test/fix.png"]').exists()).toBe(true))
    expect(wrapper.get('strong').text()).toBe('Before.')
    expect(wrapper.get('img[alt="fix.png"]').attributes('src')).toBe('https://assets.test/fix.png')
    expect(wrapper.text()).toContain('After.')
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

  it('locks editing and feedback actions while an image uploads', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(makeFeedback())
    vi.mocked(selectFilesWithUploadLimit).mockResolvedValueOnce([new File(['image'], 'fix.png')])
    let finishUpload!: (url: string) => void
    vi.mocked(saveFile).mockImplementationOnce(() => new Promise((resolve) => (finishUpload = resolve)))
    const { wrapper } = await mountPages('/admin/feedback/1')
    const input = await vi.waitFor(() =>
      wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    )
    await input.setValue('Before. Replace this. After.')
    input.element.setSelectionRange(8, 21)
    await wrapper.get('[aria-label="Add reply images button"]').trigger('click')
    await vi.waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1))
    expect(input.element.readOnly).toBe(true)
    expect(wrapper.get('[aria-label="Send reply button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="No reply needed button"]').attributes('disabled')).toBeDefined()
    finishUpload('kodo://test/fix.png')
    await vi.waitFor(() => expect(input.element.readOnly).toBe(false))
    expect(input.element.value).toBe('Before. \n\n![fix.png](<kodo://test/fix.png>)\n\n After.')
    expect(feedbackAdminApis.createFeedbackReply).not.toHaveBeenCalled()
    expect(feedbackAdminApis.updateFeedback).not.toHaveBeenCalled()
  })

  it('keeps uploaded image Markdown when a later upload or sending fails', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(makeFeedback())
    vi.mocked(selectFilesWithUploadLimit).mockResolvedValueOnce([
      new File(['image'], 'fix[1].png'),
      new File(['image'], 'second.png')
    ])
    vi.mocked(saveFile).mockResolvedValueOnce('kodo://test/fix.png').mockRejectedValueOnce(new Error('offline'))
    vi.mocked(feedbackAdminApis.createFeedbackReply).mockRejectedValue(new Error('offline'))
    const { wrapper } = await mountPages('/admin/feedback/1')
    const input = await vi.waitFor(() =>
      wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    )
    await input.setValue('A fix.')
    input.element.setSelectionRange(6, 6)
    await wrapper.get('[aria-label="Add reply images button"]').trigger('click')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Failed to add images'))
    await vi.waitFor(() => expect(input.element.readOnly).toBe(false))
    const content = 'A fix.\n\n![fix\\[1\\].png](<kodo://test/fix.png>)'
    expect(input.element.value.trim()).toBe(content)
    await wrapper.get('[aria-label="Send reply button"]').trigger('click')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Failed to send reply'))
    expect(feedbackAdminApis.createFeedbackReply).toHaveBeenCalledWith('1', { content })
    expect(input.element.value.trim()).toBe(content)
    expect(saveFile).toHaveBeenCalledTimes(2)
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

  it('counts uploaded image Markdown toward the reply length', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(makeFeedback())
    vi.mocked(selectFilesWithUploadLimit).mockResolvedValueOnce([new File(['image'], 'fix.png')])
    vi.mocked(saveFile).mockResolvedValueOnce('kodo://test/fix.png')
    const { wrapper } = await mountPages('/admin/feedback/1')
    const input = await vi.waitFor(() =>
      wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    )
    const maxLength = feedbackAdminApis.feedbackReplyContentMaxLength
    await input.setValue('a'.repeat(maxLength))
    input.element.setSelectionRange(maxLength, maxLength)
    await wrapper.get('[aria-label="Add reply images button"]').trigger('click')
    await vi.waitFor(() => expect(input.element.value).toContain('![fix.png]'))
    await vi.waitFor(() => expect(input.element.readOnly).toBe(false))
    await wrapper.get('[aria-label="Send reply button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain(`The reply must be ${maxLength} characters or fewer`))
    expect(feedbackAdminApis.createFeedbackReply).not.toHaveBeenCalled()
    expect(input.element.value).toContain('kodo://test/fix.png')
  })

  it('inserts multiple images in order without replacing surrounding text', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(makeFeedback())
    vi.mocked(selectFilesWithUploadLimit).mockResolvedValueOnce([
      new File(['image'], 'first.png'),
      new File(['image'], 'second.png')
    ])
    vi.mocked(saveFile).mockResolvedValueOnce('kodo://test/first.png').mockResolvedValueOnce('kodo://test/second.png')
    const { wrapper } = await mountPages('/admin/feedback/1')
    const input = await vi.waitFor(() =>
      wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    )
    await input.setValue('Before.After.')
    input.element.setSelectionRange(7, 7)
    await wrapper.get('[aria-label="Add reply images button"]').trigger('click')
    await vi.waitFor(() => expect(input.element.value).toContain('second.png'))
    expect(input.element.value).toBe(
      'Before.\n\n![first.png](<kodo://test/first.png>)\n\n\n\n![second.png](<kodo://test/second.png>)\n\nAfter.'
    )
  })

  it('inserts an image at the beginning without replacing the draft', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(makeFeedback())
    vi.mocked(selectFilesWithUploadLimit).mockResolvedValueOnce([new File(['image'], 'fix.png')])
    vi.mocked(saveFile).mockResolvedValueOnce('kodo://test/fix.png')
    const { wrapper } = await mountPages('/admin/feedback/1')
    const input = await vi.waitFor(() =>
      wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    )
    await input.setValue('After.')
    input.element.setSelectionRange(0, 0)
    await wrapper.get('[aria-label="Add reply images button"]').trigger('click')
    await vi.waitFor(() => expect(input.element.value).toBe('\n\n![fix.png](<kodo://test/fix.png>)\n\nAfter.'))
  })

  it('keeps drafts and pending uploads with their feedback when navigating directly', async () => {
    await signIn({ canManageFeedback: true })
    vi.mocked(feedbackAdminApis.getFeedback).mockImplementation(async (id) =>
      makeFeedback({ id, title: `Report ${id}` })
    )
    vi.mocked(selectFilesWithUploadLimit).mockResolvedValueOnce([new File(['image'], 'fix.png')])
    let finishUpload!: (url: Awaited<ReturnType<typeof saveFile>>) => void
    vi.mocked(saveFile).mockImplementationOnce(() => new Promise((resolve) => (finishUpload = resolve)))
    vi.mocked(feedbackAdminApis.createFeedbackReply).mockResolvedValue({
      content: 'Reply for B',
      createdAt: '2026-01-03T00:00:00Z'
    })
    const { wrapper, router } = await mountPages('/admin/feedback/1')
    const input = await vi.waitFor(() =>
      wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    )
    await input.setValue('Draft for A')
    await wrapper.get('[aria-label="Add reply images button"]').trigger('click')
    await vi.waitFor(() => expect(saveFile).toHaveBeenCalledOnce())
    await router.push('/admin/feedback/2')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Report 2'))
    const nextInput = wrapper.get<HTMLTextAreaElement>('[aria-label="Reply content input"] textarea')
    expect(nextInput.element.value).toBe('')
    finishUpload('kodo://test/fix.png')
    await flushPromises()
    expect(nextInput.element.value).toBe('')
    await nextInput.setValue('Reply for B')
    await wrapper.get('[aria-label="Send reply button"]').trigger('click')
    await vi.waitFor(() =>
      expect(feedbackAdminApis.createFeedbackReply).toHaveBeenCalledWith('2', { content: 'Reply for B' })
    )
    expect(feedbackAdminApis.createFeedbackReply).toHaveBeenCalledOnce()
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
