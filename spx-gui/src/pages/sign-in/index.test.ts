import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import expectedLogoSrc from './assets/sign-in-logo.svg'

const { replace, initiateWeChatSignIn, initiateQQSignIn, initiateSignIn } = vi.hoisted(() => ({
  replace: vi.fn(),
  initiateWeChatSignIn: vi.fn(),
  initiateQQSignIn: vi.fn(),
  initiateSignIn: vi.fn()
}))

let signedInState = { isSignedIn: false, user: null as null | { username: string } }

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { returnTo: '/project/alice/demo' } }),
  useRouter: () => ({ replace })
}))

vi.mock('@/stores/user', () => ({
  normalizeSafeReturnTo: (value: string | undefined) => value ?? '/',
  useSignedInStateQuery: () => ({
    isLoading: { value: false },
    data: { value: signedInState }
  }),
  initiateWeChatSignIn,
  initiateQQSignIn,
  initiateSignIn
}))

vi.mock('@/components/ui', () => ({
  UIButton: defineComponent({
    name: 'UIButton',
    emits: ['click'],
    setup(_, { slots, attrs, emit }) {
      return () =>
        h(
          'button',
          {
            ...attrs,
            onClick: () => emit('click')
          },
          slots.default?.()
        )
    }
  })
}))

vi.mock('@/utils/utils', () => ({
  usePageTitle: vi.fn()
}))

import SignInPage from './index.vue'

describe('sign-in page shell', () => {
  beforeEach(() => {
    replace.mockReset()
    initiateWeChatSignIn.mockReset()
    initiateQQSignIn.mockReset()
    initiateSignIn.mockReset()
    signedInState = { isSignedIn: false, user: null }
  })

  it('renders the three approved sign-in actions', () => {
    const wrapper = mount(SignInPage, {
      global: {
        mocks: {
          $t: (value: { en?: string; zh?: string }) => value.zh ?? value.en ?? ''
        }
      }
    })
    expect(wrapper.text()).toContain('XBuilder')
    expect(wrapper.text()).toContain('登录')
    expect(wrapper.text()).toContain('使用微信登录')
    expect(wrapper.text()).toContain('使用 QQ 登录')
    expect(wrapper.text()).toContain('用户名密码登录')
    expect(wrapper.get('.logo').attributes('src')).toBe(expectedLogoSrc)
  })

  it('redirects signed-in visitors away from /sign-in', async () => {
    signedInState = { isSignedIn: true, user: { username: 'alice' } }

    mount(SignInPage, {
      global: {
        mocks: {
          $t: (value: { en?: string; zh?: string }) => value.zh ?? value.en ?? ''
        }
      }
    })

    await flushPromises()
    expect(replace).toHaveBeenCalledWith('/project/alice/demo')
  })

  it('calls provider-specific helpers with the normalized return target', async () => {
    const wrapper = mount(SignInPage, {
      global: {
        mocks: {
          $t: (value: { en?: string; zh?: string }) => value.zh ?? value.en ?? ''
        }
      }
    })

    await wrapper.find('[data-testid="sign-in-wechat"]').trigger('click')
    await wrapper.find('[data-testid="sign-in-qq"]').trigger('click')
    await wrapper.find('[data-testid="sign-in-password"]').trigger('click')

    expect(initiateWeChatSignIn).toHaveBeenCalledWith('/project/alice/demo')
    expect(initiateQQSignIn).toHaveBeenCalledWith('/project/alice/demo')
    expect(initiateSignIn).toHaveBeenCalledWith('/project/alice/demo')
  })
})
