import { createApp } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { accountOAuthApisForXBuilder } from '@/apis/account/oauth'
import { initUserState, useSignIn } from './signed-in'

vi.mock('@/apis/account/oauth', () => ({
  accountOAuthApisForXBuilder: {
    createPAR: vi.fn(async () => ({ request_uri: 'urn:test:request-uri' })),
    buildAuthorizeUrl: vi.fn(() => 'https://account.example.com/oauth/authorize'),
    exchangeToken: vi.fn(),
    refreshToken: vi.fn(),
    revokeToken: vi.fn()
  }
}))

describe('signed-in user state', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('uses configured OAuth redirect URI when creating authorization', async () => {
    initUserState('client-1', { redirectUri: 'https://staging.example.com/sign-in/callback' })

    const app = createApp({})
    app.use(createI18n({ lang: 'en' }))

    let signIn!: ReturnType<typeof useSignIn>
    app.runWithContext(() => {
      signIn = useSignIn()
    })

    await signIn('/editor/project')

    expect(accountOAuthApisForXBuilder.createPAR).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-1',
        redirect_uri: 'https://staging.example.com/sign-in/callback'
      })
    )
    expect(window.location.href).toBe('https://account.example.com/oauth/authorize')
  })
})
