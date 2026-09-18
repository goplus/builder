import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { ApiExceptionCode } from '@/apis/common/exception'
import { createI18n } from '@/utils/i18n'
import { RoundState, type Round } from '../../copilot'
import QuotaExceeded from './QuotaExceeded.vue'

function createQuotaRound() {
  return {
    state: RoundState.Failed,
    apiExceptionCode: ApiExceptionCode.errorQuotaExceeded,
    apiExceptionMeta: { retryAfter: null },
    retry: () => {}
  } as unknown as Round
}

function mountQuotaExceeded(feedbackMode: 'default' | 'guidance' | 'action' = 'default') {
  return mount(QuotaExceeded, {
    props: {
      round: createQuotaRound(),
      isLastRound: true,
      feedbackMode
    },
    global: {
      plugins: [createI18n({ lang: 'en' })]
    }
  })
}

describe('QuotaExceeded', () => {
  it('keeps the current quota message by default', () => {
    const wrapper = mountQuotaExceeded()

    expect(wrapper.text()).toContain('Quota exceeded.')
    expect(wrapper.text()).not.toContain('profile menu')
    expect(wrapper.find('[data-test-id="quota-feedback"]').exists()).toBe(false)
  })

  it('shows the profile-menu guidance', () => {
    const wrapper = mountQuotaExceeded('guidance')

    expect(wrapper.text()).toContain('choose “Send feedback” from the profile menu in the top-right corner')
  })

  it('emits feedback from the direct action', async () => {
    const wrapper = mountQuotaExceeded('action')

    await wrapper.get('[data-test-id="quota-feedback"]').trigger('click')

    expect(wrapper.emitted('feedback')).toHaveLength(1)
  })
})
