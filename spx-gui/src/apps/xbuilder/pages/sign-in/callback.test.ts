import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, Suspense } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  complete: vi.fn(),
  failureReturnTo: '/course-series/series?p=3'
}))

vi.mock('@/stores/user', () => ({
  completeSignIn: mocks.complete,
  getSignInFailureReturnTo: () => mocks.failureReturnTo
}))
vi.mock('@/utils/utils', () => ({ usePageTitle: vi.fn() }))

import SignInCallback from './callback.vue'

enableAutoUnmount(afterEach)

async function openCallback() {
  mount(defineComponent({ render: () => h(Suspense, null, { default: () => h(SignInCallback) }) }), {
    global: { mocks: { $t: (message: { en: string }) => message.en } }
  })
  await flushPromises()
}

describe('Sign-in callback destinations', () => {
  beforeEach(() => {
    mocks.complete.mockReset()
    mocks.failureReturnTo = '/course-series/series?p=3'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('enters the originally selected Course after successful sign-in', async () => {
    const replace = vi.spyOn(window.location, 'replace').mockImplementation(() => {})
    mocks.complete.mockResolvedValue({ returnTo: '/course/series/course/playground/sprites/Lita/code' })
    await openCallback()
    expect(replace).toHaveBeenCalledWith('/course/series/course/playground/sprites/Lita/code')
  })

  it('returns to the captured list context when completion fails and consumes pending state', async () => {
    const replace = vi.spyOn(window.location, 'replace').mockImplementation(() => {})
    mocks.complete.mockImplementation(async () => {
      mocks.failureReturnTo = '/'
      throw new Error('Token exchange failed')
    })
    await openCallback()
    expect(replace).toHaveBeenCalledWith('/course-series/series?p=3')
  })

  it('retains the home fallback for other sign-in flows', async () => {
    const replace = vi.spyOn(window.location, 'replace').mockImplementation(() => {})
    mocks.failureReturnTo = '/'
    mocks.complete.mockRejectedValue(new Error('Sign-in failed'))
    await openCallback()
    expect(replace).toHaveBeenCalledWith('/')
  })
})
