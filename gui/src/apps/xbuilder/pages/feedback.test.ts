import type { VueWrapper } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import {
  setupPageTests,
  mountPages,
  makeFeedback,
  signIn,
  askCopilot,
  findCopilotButton
} from '@/apps/xbuilder/pages/test'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import * as copilotApis from '@/apis/copilot'
import { feedbackDescriptionMaxLength, feedbackTitleMaxLength } from '@/apis/feedback'
import * as feedbackApis from '@/apis/feedback'
import { saveProjectSnapshot } from '@/components/feedback/project-snapshot'

vi.mock('@/components/feedback/project-snapshot', { spy: true })

async function fillFeedbackForm(wrapper: VueWrapper) {
  await vi.waitFor(() => expect(wrapper.find('[aria-label="Profile menu"]').exists()).toBe(true))
  await wrapper.get('[aria-label="Profile menu"]').trigger('click')
  await vi.waitFor(() =>
    expect(wrapper.findAll('.ui-menu-item').some((item) => item.text() === 'Send feedback...')).toBe(true)
  )
  await wrapper
    .findAll('.ui-menu-item')
    .find((item) => item.text() === 'Send feedback...')!
    .trigger('click')
  await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true))
  const modal = wrapper.get('[aria-label="Feedback modal"]')
  await modal.get('[aria-label="Feedback title input"] input').setValue(' Sprite stops moving ')
  await modal.get('[aria-label="Feedback description input"] textarea').setValue('It no longer moves.')
  return modal
}

async function sendFeedback(wrapper: VueWrapper, { shareContext = true } = {}) {
  const modal = await fillFeedbackForm(wrapper)
  if (!shareContext) await modal.get('input[type="checkbox"]').setValue(false)
  await modal.get('form').trigger('submit')
  await vi.waitFor(() => expect(feedbackApis.createFeedback).toHaveBeenCalledTimes(1))
  await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(false))
  return vi.mocked(feedbackApis.createFeedback).mock.calls[0][0]
}

describe('feedback', () => {
  setupPageTests()

  function mockCreateFeedback() {
    vi.mocked(feedbackApis.createFeedback).mockImplementation(async (params) => makeFeedback(params))
  }

  it('sends feedback with page context from the profile menu', async () => {
    await signIn()
    mockCreateFeedback()
    const { wrapper } = await mountPages('/explore')

    const params = await sendFeedback(wrapper)

    expect(params).toEqual({
      title: 'Sprite stops moving',
      description: 'It no longer moves.',
      context: {
        source: 'profileMenu',
        page: { path: '/explore', language: 'en' }
      }
    })
  })

  it('sends feedback drafted by Copilot from the button in its reply', async () => {
    await signIn()
    mockCreateFeedback()
    const draft = {
      title: 'Saving fails with "Save failed" & no details',
      description:
        'I clicked Save and saw:\nSave failed: "Hero" & <Stage> are invalid\nThe sprite list shows &lt;sprite&gt;. I have tried refreshing the page.'
    }
    const escapeAttribute = (value: string) =>
      value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('\n', '&#10;')
    vi.mocked(copilotApis.generateCopilotMessage).mockImplementation(async function* () {
      yield {
        type: 'text_delta',
        data: {
          text: `I could not fix this. You can <feedback-link title="${escapeAttribute(draft.title)}" description="${escapeAttribute(draft.description)}">send feedback</feedback-link> to the XBuilder team.`
        }
      }
      yield { type: 'done', data: { finishReason: 'stop' } }
    })
    const { wrapper } = await mountPages('/explore')

    await askCopilot(wrapper, 'Saving still fails')
    await vi.waitFor(() => expect(findCopilotButton(wrapper, 'send feedback')).toBeDefined())
    const feedbackLink = findCopilotButton(wrapper, 'send feedback')!
    expect(feedbackLink.element.closest('p')?.textContent).toBe(
      'I could not fix this. You can send feedback to the XBuilder team.'
    )
    expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(false)

    await feedbackLink.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true))
    const modal = wrapper.get('[aria-label="Feedback modal"]')
    expect(modal.get<HTMLInputElement>('[aria-label="Feedback title input"] input').element.value).toBe(draft.title)
    expect(modal.get<HTMLTextAreaElement>('[aria-label="Feedback description input"] textarea').element.value).toBe(
      draft.description
    )
    expect(feedbackApis.createFeedback).not.toHaveBeenCalled()

    await modal.get('form').trigger('submit')
    await vi.waitFor(() => expect(feedbackApis.createFeedback).toHaveBeenCalledTimes(1))
    expect(vi.mocked(feedbackApis.createFeedback).mock.calls[0][0]).toEqual({
      ...draft,
      context: {
        source: 'copilotReply',
        page: { path: '/explore', language: 'en' }
      }
    })
  })

  it('disables the feedback link while its form is open', async () => {
    await signIn()
    mockCreateFeedback()
    vi.mocked(copilotApis.generateCopilotMessage).mockImplementation(async function* () {
      yield {
        type: 'text_delta',
        data: {
          text: 'You can <feedback-link title="Saving fails" description="I clicked Save and nothing happened.">send feedback</feedback-link> to the XBuilder team.'
        }
      }
      yield { type: 'done', data: { finishReason: 'stop' } }
    })
    const { wrapper } = await mountPages('/explore')
    await askCopilot(wrapper, 'Saving still fails')
    await vi.waitFor(() => expect(findCopilotButton(wrapper, 'send feedback')).toBeDefined())

    // The Copilot panel stays above the modal mask, so the link stays visible while its form is open.
    await findCopilotButton(wrapper, 'send feedback')!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true))
    expect(findCopilotButton(wrapper, 'send feedback')!.element.disabled).toBe(true)

    await wrapper.get('[aria-label="Feedback modal"] form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(false))
    await findCopilotButton(wrapper, 'send feedback')!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true))
    expect(feedbackApis.createFeedback).toHaveBeenCalledTimes(1)
  })

  it('sends feedback from the Copilot quota-exceeded message', async () => {
    await signIn()
    mockCreateFeedback()
    const req = new Request('http://localhost/api/copilot/messages', { method: 'POST' })
    let shouldExceedQuota = false
    vi.mocked(copilotApis.generateCopilotMessage).mockImplementation(async function* () {
      yield* []
      if (!shouldExceedQuota) {
        throw new ApiException(ApiExceptionCode.errorInternalServerError, 'internal error', { req })
      }
      throw new ApiException(ApiExceptionCode.errorQuotaExceeded, 'quota exceeded', {
        req,
        meta: { retryAfter: Date.now() + 3600_000 }
      })
    })
    const { wrapper } = await mountPages('/explore')

    await askCopilot(wrapper, 'How do I make my sprite jump?')
    const findButton = (text: string) => findCopilotButton(wrapper, text)
    await vi.waitFor(() => expect(findButton('Retry')).toBeDefined())
    expect(findButton('Report an issue')).toBeUndefined()

    shouldExceedQuota = true
    await findButton('Retry')!.trigger('click')
    await vi.waitFor(() => expect(wrapper.get('.copilot-panel').text()).toContain('Quota exceeded.'))
    const reportButton = findButton('Report an issue')
    expect(reportButton).toBeDefined()
    expect(reportButton!.element.parentElement).toBe(findButton('Retry')!.element.parentElement)

    await reportButton!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true))
    expect(findButton('Report an issue')!.element.disabled).toBe(true)
    const modal = wrapper.get('[aria-label="Feedback modal"]')
    expect(modal.get<HTMLInputElement>('[aria-label="Feedback title input"] input').element.value).toBe('')
    expect(modal.get<HTMLTextAreaElement>('[aria-label="Feedback description input"] textarea').element.value).toBe('')

    await modal.get('[aria-label="Feedback title input"] input').setValue('Quota ran out during class')
    await modal
      .get('[aria-label="Feedback description input"] textarea')
      .setValue('I sent a few messages while building my game and hit the quota limit.')
    await modal.get('form').trigger('submit')
    await vi.waitFor(() => expect(feedbackApis.createFeedback).toHaveBeenCalledTimes(1))
    expect(vi.mocked(feedbackApis.createFeedback).mock.calls[0][0]).toEqual({
      title: 'Quota ran out during class',
      description: 'I sent a few messages while building my game and hit the quota limit.',
      context: {
        source: 'copilotQuotaExceeded',
        page: { path: '/explore', language: 'en' }
      }
    })
  })

  it('sends feedback without context when sharing is turned off', async () => {
    await signIn()
    mockCreateFeedback()
    const { wrapper } = await mountPages('/explore')

    const params = await sendFeedback(wrapper, { shareContext: false })

    expect(params.context).toBeUndefined()
  })

  it('includes the editing project and its snapshot in the context', async () => {
    await signIn()
    mockCreateFeedback()
    vi.mocked(saveProjectSnapshot).mockResolvedValue('kodo://test/files/project-snapshot.json')
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })

    const params = await sendFeedback(wrapper)

    expect(params.context).toMatchObject({
      page: { path: expect.stringMatching(/^\/editor\/alice\/First%20flight/) },
      project: { identifier: 'alice/First flight', displayName: 'First flight' },
      projectSnapshotUrl: 'kodo://test/files/project-snapshot.json'
    })
  })

  it('explains page state when the checkbox gets focus', async () => {
    await signIn()
    const { wrapper } = await mountPages('/explore')

    const modal = await fillFeedbackForm(wrapper)
    const checkbox = modal.get<HTMLInputElement>('input[type="checkbox"]').element
    const explanation = 'This may include page details, a copy of your project, code diagnostics, and runtime output'
    checkbox.focus()
    await vi.waitFor(() => expect(document.body.textContent).toContain(explanation))
    checkbox.blur()
    await vi.waitFor(() => expect(document.body.textContent).not.toContain(explanation))
  })

  it('does not send feedback longer than the limits', async () => {
    await signIn()
    mockCreateFeedback()
    const { wrapper } = await mountPages('/explore')

    const modal = await fillFeedbackForm(wrapper)
    await modal.get('[aria-label="Feedback title input"] input').setValue('x'.repeat(feedbackTitleMaxLength + 1))
    await modal
      .get('[aria-label="Feedback description input"] textarea')
      .setValue('x'.repeat(feedbackDescriptionMaxLength + 1))
    await modal.get('form').trigger('submit')
    await vi.waitFor(() =>
      expect(modal.text()).toContain(`The title must be ${feedbackTitleMaxLength} characters or fewer`)
    )
    expect(modal.text()).toContain(`The description must be ${feedbackDescriptionMaxLength} characters or fewer`)
    expect(feedbackApis.createFeedback).not.toHaveBeenCalled()
  })

  it('keeps the entered feedback when sending fails', async () => {
    await signIn()
    mockCreateFeedback()
    vi.mocked(feedbackApis.createFeedback).mockRejectedValueOnce(
      new ApiException(ApiExceptionCode.errorInternalServerError, 'internal error', {
        req: new Request('http://localhost/api/user/feedback', { method: 'POST' })
      })
    )
    const { wrapper } = await mountPages('/explore')

    const modal = await fillFeedbackForm(wrapper)
    await modal.get('form').trigger('submit')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Failed to send feedback'))
    expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true)
    expect(modal.get<HTMLInputElement>('[aria-label="Feedback title input"] input').element.value).toBe(
      ' Sprite stops moving '
    )
    expect(modal.get<HTMLTextAreaElement>('[aria-label="Feedback description input"] textarea').element.value).toBe(
      'It no longer moves.'
    )

    await modal.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(false))
    expect(feedbackApis.createFeedback).toHaveBeenCalledTimes(2)
  })

  it('does not close the form while sending', async () => {
    await signIn()
    let resolveCreate: () => void = () => {}
    vi.mocked(feedbackApis.createFeedback).mockImplementation(
      (params) => new Promise((resolve) => (resolveCreate = () => resolve(makeFeedback(params))))
    )
    const { wrapper } = await mountPages('/explore')

    const modal = await fillFeedbackForm(wrapper)
    await modal.get('form').trigger('submit')
    await vi.waitFor(() => expect(feedbackApis.createFeedback).toHaveBeenCalledTimes(1))
    expect(
      modal
        .findAll('button')
        .find((button) => button.text() === 'Cancel')!
        .attributes('disabled')
    ).toBeDefined()
    await modal.get('[aria-label="Close button"]').trigger('click')
    expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true)

    resolveCreate()
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(false))
  })
})
