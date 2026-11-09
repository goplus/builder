import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createI18n } from '@/utils/i18n'

import PasswordSection from './PasswordSection.vue'

describe('PasswordSection', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('disables submission and counts down until retry is allowed', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T00:00:00Z'))
    const wrapper = mount(PasswordSection, {
      props: {
        isSubmitting: false,
        retryAfter: Date.now() + 61_000
      },
      global: {
        plugins: [createI18n({ lang: 'en' })]
      }
    })
    const submitButton = wrapper.get('button[type="submit"]')

    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(submitButton.text()).toBe('Try again in 01:01')
    expect(wrapper.get('input[type="text"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('input[type="password"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('input[type="text"]').setValue('alice')
    await wrapper.get('input[type="password"]').setValue('password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('submit')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1000)
    expect(submitButton.text()).toBe('Try again in 01:00')

    await vi.advanceTimersByTimeAsync(60_000)
    expect(submitButton.attributes('disabled')).toBeUndefined()
    expect(submitButton.text()).toBe('Sign In')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('submit')).toEqual([[{ username: 'alice', password: 'password' }]])

    wrapper.unmount()
  })

  it('does not submit while a request is in progress', async () => {
    const wrapper = mount(PasswordSection, {
      props: {
        isSubmitting: true,
        retryAfter: null
      },
      global: {
        plugins: [createI18n({ lang: 'en' })]
      }
    })

    await wrapper.get('input[type="text"]').setValue('alice')
    await wrapper.get('input[type="password"]').setValue('password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('submit')).toBeUndefined()

    await wrapper.setProps({ isSubmitting: false })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('submit')).toEqual([[{ username: 'alice', password: 'password' }]])

    wrapper.unmount()
  })
})
