import type { VueWrapper } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { FeedbackStatus, type CreateFeedbackParams, type Feedback } from '@/apis/feedback'
import * as feedbackApis from '@/apis/feedback'

async function fillFeedbackForm(wrapper: VueWrapper) {
  await vi.waitFor(() => expect(wrapper.find('[aria-label="Profile menu"]').exists()).toBe(true))
  await wrapper.get('[aria-label="Profile menu"]').trigger('mouseenter')
  await vi.waitFor(() =>
    expect(wrapper.findAll('.ui-menu-item').some((item) => item.text() === 'Send feedback')).toBe(true)
  )
  await wrapper
    .findAll('.ui-menu-item')
    .find((item) => item.text() === 'Send feedback')!
    .trigger('click')
  await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true))
  const modal = wrapper.get('[aria-label="Feedback modal"]')
  await modal.get('[aria-label="Feedback title input"] input').setValue(' Sprite stops moving ')
  await modal.get('[aria-label="Feedback description input"] textarea').setValue('It no longer moves.')
  return modal
}

function makeFeedback(params: CreateFeedbackParams): Feedback {
  return {
    ...params,
    id: '1',
    owner: 'alice',
    status: FeedbackStatus.New,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z'
  }
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

  it('sends feedback without context when sharing is turned off', async () => {
    await signIn()
    mockCreateFeedback()
    const { wrapper } = await mountPages('/explore')

    const params = await sendFeedback(wrapper, { shareContext: false })

    expect(params.context).toBeUndefined()
  })

  it('includes the editing project in the context', async () => {
    await signIn()
    mockCreateFeedback()
    const { wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })

    const params = await sendFeedback(wrapper)

    expect(params.context).toMatchObject({
      page: { path: expect.stringMatching(/^\/editor\/alice\/First%20flight/) },
      project: { identifier: 'alice/First flight', displayName: 'First flight' }
    })
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
