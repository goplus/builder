import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { buildIdentityProviderAuthorizeUrl, getIdentityProviders, getSession } from '@/apis/account'
import { accountOAuthApis } from '@/apis/account/oauth'
import ProviderButton from './provider-button/ProviderButton.vue'
import SignInForm from './SignInForm.vue'

vi.mock('@/apis/account', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/account')>()),
  getSession: vi.fn(),
  getIdentityProviders: vi.fn()
}))

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useMessage: () => ({ success: vi.fn(), error: vi.fn() })
}))

enableAutoUnmount(afterEach)

describe('SignInForm', () => {
  const request = { clientId: 'xbuilder', requestUri: 'urn:ietf:params:oauth:request_uri:test' }
  const provider = { name: 'wechat', displayName: 'WeChat', enabled: true } as const

  function mountForm() {
    return shallowMount(SignInForm, {
      props: { request },
      global: { plugins: [createI18n({ lang: 'en' })] }
    })
  }

  function restorePage(persisted = true) {
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted }))
  }

  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(getSession).mockReset().mockResolvedValue(null)
    vi.mocked(getIdentityProviders).mockReset().mockResolvedValue([provider])
    vi.spyOn(window.location, 'assign').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('resumes the original authorization when a restored page has a new session', async () => {
    const wrapper = mountForm()
    await flushPromises()
    wrapper.getComponent(ProviderButton).vm.$emit('click')
    await flushPromises()

    vi.mocked(getSession).mockResolvedValue({
      id: 'session-id',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      lastUsedAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-01-02T00:00:00Z',
      user: {
        id: 'user-id',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        username: 'alice',
        displayName: 'Alice',
        avatar: ''
      }
    })
    restorePage()
    await flushPromises()
    expect(window.location.assign).toHaveBeenLastCalledWith(
      accountOAuthApis.buildAuthorizeUrl({ client_id: request.clientId, request_uri: request.requestUri })
    )
    expect(window.location.assign).toHaveBeenCalledTimes(2)
  })

  it('allows retry after returning from provider authorization through the back-forward cache', async () => {
    const wrapper = mountForm()
    await flushPromises()
    restorePage(false)
    await flushPromises()
    expect(getSession).toHaveBeenCalledTimes(1)

    wrapper.getComponent(ProviderButton).vm.$emit('click')
    await flushPromises()
    expect(window.location.assign).toHaveBeenCalledWith(buildIdentityProviderAuthorizeUrl(provider.name, request))
    expect(wrapper.findComponent(ProviderButton).exists()).toBe(false)

    restorePage()
    await flushPromises()
    expect(getSession).toHaveBeenCalledTimes(2)
    wrapper.getComponent(ProviderButton).vm.$emit('click')
    expect(window.location.assign).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    restorePage()
    await flushPromises()
    expect(getSession).toHaveBeenCalledTimes(2)
  })
})
