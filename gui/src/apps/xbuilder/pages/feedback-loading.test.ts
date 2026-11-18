import { describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'

// Kept apart from feedback.test.ts: the first load of FeedbackModal in this file must be the one that fails.
const modalLoad = vi.hoisted(() => ({ fail: true }))
vi.mock('@/components/feedback/FeedbackModal.vue', async (importOriginal) => {
  if (modalLoad.fail) {
    modalLoad.fail = false
    throw new TypeError('Failed to fetch dynamically imported module')
  }
  return importOriginal()
})

async function openFeedbackFromProfileMenu(wrapper: VueWrapper) {
  await vi.waitFor(() => expect(wrapper.find('[aria-label="Profile menu"]').exists()).toBe(true))
  await wrapper.get('[aria-label="Profile menu"]').trigger('click')
  await vi.waitFor(() =>
    expect(wrapper.findAll('.ui-menu-item').some((item) => item.text() === 'Send feedback...')).toBe(true)
  )
  await wrapper
    .findAll('.ui-menu-item')
    .find((item) => item.text() === 'Send feedback...')!
    .trigger('click')
}

describe('feedback form loading', () => {
  setupPageTests()

  it('opens the form on the next try after it failed to load', async () => {
    await signIn()
    const { wrapper } = await mountPages('/explore')
    const errorHandler = vi.fn()
    wrapper.vm.$.appContext.config.errorHandler = errorHandler

    await openFeedbackFromProfileMenu(wrapper)
    await vi.waitFor(() => expect(errorHandler).toHaveBeenCalledTimes(1))
    expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(false)

    await openFeedbackFromProfileMenu(wrapper)
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Feedback modal"]').exists()).toBe(true))
    expect(errorHandler).toHaveBeenCalledTimes(1)
  })
})
