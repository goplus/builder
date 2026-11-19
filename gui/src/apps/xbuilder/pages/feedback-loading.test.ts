import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn, askCopilot, findCopilotButton } from '@/apps/xbuilder/pages/test'
import * as copilotApis from '@/apis/copilot'

// Kept apart from feedback.test.ts: the first load of FeedbackModal in this file must be the one that fails.
const modalLoad = vi.hoisted(() => ({ fail: true }))
vi.mock('@/components/feedback/FeedbackModal.vue', async (importOriginal) => {
  if (modalLoad.fail) {
    modalLoad.fail = false
    throw new TypeError('Failed to fetch dynamically imported module')
  }
  return importOriginal()
})

describe('feedback form loading', () => {
  setupPageTests()

  it('enables the feedback link again after the form failed to load', async () => {
    await signIn()
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
    const errorHandler = vi.fn()
    wrapper.vm.$.appContext.config.errorHandler = errorHandler
    await askCopilot(wrapper, 'Saving still fails')
    await vi.waitFor(() => expect(findCopilotButton(wrapper, 'send feedback')).toBeDefined())

    await findCopilotButton(wrapper, 'send feedback')!.trigger('click')
    await vi.waitFor(() => expect(errorHandler).toHaveBeenCalledTimes(1))
    expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(false)

    await findCopilotButton(wrapper, 'send feedback')!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true))
    expect(errorHandler).toHaveBeenCalledTimes(1)
  })
})
