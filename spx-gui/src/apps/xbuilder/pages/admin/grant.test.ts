import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as accountAdminApis from '@/apis/admin/account'

describe('admin app grant', () => {
  setupPageTests()

  it('creates and copies a test access token, then filters the app grant token list', async () => {
    await signIn({ canManageAccount: true })
    const user = {
      id: 'pilot',
      username: 'pilot',
      displayName: 'Space pilot',
      avatar: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
    const app: accountAdminApis.AccountApp = {
      id: 'flight',
      name: 'flight',
      displayName: 'Flight planner',
      clientType: 'public',
      status: 'active',
      redirectURIs: ['https://flight.test/callback'],
      redirectURIPatterns: [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
    vi.mocked(accountAdminApis.getAccountUser).mockResolvedValue(user)
    vi.mocked(accountAdminApis.getAccountAppGrant).mockResolvedValue({
      id: 'grant',
      userID: user.id,
      appID: app.id,
      app,
      scope: 'openid profile',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    })
    let tokens: accountAdminApis.AccountAppToken[] = []
    vi.mocked(accountAdminApis.listAccountAppGrantTokens).mockImplementation(async (_id, params) => {
      const data = tokens.filter((token) => params?.tokenType == null || token.tokenType === params.tokenType)
      return { total: data.length, data }
    })
    vi.mocked(accountAdminApis.createAccountAppGrantToken).mockImplementation(async (_id, params) => {
      const token = {
        ...params,
        id: 'test-token-id',
        grantID: 'grant',
        scope: 'openid profile',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
      tokens = [token]
      return { ...token, value: 'test-only-access-token' }
    })
    const { wrapper } = await mountPages('/admin/users/pilot/app-grants/grant')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Flight planner'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create')!
      .trigger('click')
    const create = wrapper.get('form')
    await create.get('input:not([type="datetime-local"])').setValue('Test automation')
    const expiresAt = create.get<HTMLInputElement>('input[type="datetime-local"]').element.value
    await create.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.createAccountAppGrantToken).toHaveBeenCalledWith('grant', {
        tokenType: 'accessToken',
        name: 'Test automation',
        expiresAt: new Date(expiresAt).toISOString()
      })
    )
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Copy Access token"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Copy Access token"]').trigger('click')
    await vi.waitFor(async () => expect(await navigator.clipboard.readText()).toBe('test-only-access-token'))
    await vi.waitFor(() => expect(wrapper.find('tbody').text()).toContain('Test automation'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'I have saved it')!
      .trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Copy Access token"]').exists()).toBe(false))
    await wrapper.get('select').setValue('refreshToken')
    await vi.waitFor(() =>
      expect(accountAdminApis.listAccountAppGrantTokens).toHaveBeenLastCalledWith(
        'grant',
        expect.objectContaining({ tokenType: 'refreshToken' })
      )
    )
    await vi.waitFor(() => expect(wrapper.text()).toContain('No active tokens'))
    await wrapper.get('select').setValue('accessToken')
    await vi.waitFor(() => expect(wrapper.get('tbody').text()).toContain('Test automation'))
  })
})
