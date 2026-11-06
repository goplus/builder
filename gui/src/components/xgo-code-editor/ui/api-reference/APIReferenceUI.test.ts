import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createI18n } from '@/utils/i18n'
import APIReferenceUI from './APIReferenceUI.vue'
import type { APIReferenceController } from '.'

const { register } = vi.hoisted(() => ({ register: vi.fn() }))
vi.mock('@/utils/readiness', () => ({ useRegisterLoading: register }))

describe('API Reference readiness', () => {
  it('settles completed empty results and errors, including providers without categories', async () => {
    const controller = reactive({ items: [], error: null as Error | null, loading: true, categoryViewInfos: null })
    const wrapper = shallowMount(APIReferenceUI, {
      props: { controller: controller as unknown as APIReferenceController },
      global: { renderStubDefaultSlot: true, plugins: [createI18n({ lang: 'en' })], directives: { radar: {} } }
    })
    const pending = register.mock.calls.at(-1)![0] as () => boolean
    expect(pending()).toBe(true)
    controller.loading = false
    await flushPromises()
    expect(pending()).toBe(false)
    controller.error = new Error('API load failed')
    await flushPromises()
    expect(pending()).toBe(false)
    expect(wrapper.text()).toContain('Failed to load data')
    wrapper.unmount()
  })
})
