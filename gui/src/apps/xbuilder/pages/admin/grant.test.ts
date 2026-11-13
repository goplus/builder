import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as accountAdminApis from '@/apis/admin/account'

describe('admin app grant', () => {
  setupPageTests()

  it('creates and copies a test access token, then filters the app grant token list', async () => {
    await signIn({ canManageAccount: true })
    const user = {
      id: 'pilot',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      username: 'pilot',
      displayName: 'Space pilot',
      avatar: ''
    }
    const app: accountAdminApis.AccountApp = {
      id: 'flight',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      name: 'flight',
      displayName: 'Flight planner',
      avatar: null,
      description: null,
      status: 'active'
    }
    vi.mocked(accountAdminApis.getAccountUser).mockResolvedValue(user)
    vi.mocked(accountAdminApis.getAccountAppGrant).mockResolvedValue({
      id: 'grant',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      appID: app.id,
      userID: user.id,
      scope: 'account:user:read',
      app
    })
    vi.mocked(accountAdminApis.listAccountOAuthClients).mockResolvedValue({
      total: 1,
      data: [
        {
          id: '201',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          appID: app.id,
          clientID: 'public-client',
          name: 'web',
          clientType: 'public',
          status: 'active',
          grantTypes: ['authorization_code'],
          redirectURIs: ['https://flight.test/callback'],
          redirectURIPatterns: []
        }
      ]
    })
    let tokens: accountAdminApis.AccountAppToken[] = []
    vi.mocked(accountAdminApis.listAccountAppGrantTokens).mockImplementation(async (_id, params) => {
      const data = tokens.filter((token) => params?.tokenType == null || token.tokenType === params.tokenType)
      return { total: data.length, data }
    })
    vi.mocked(accountAdminApis.createAccountAppGrantToken).mockImplementation(async (_id, params) => {
      const token = {
        id: 'test-token-id',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        oauthClientID: params.oauthClientID,
        grantID: 'grant',
        tokenType: params.tokenType,
        scope: 'account:user:read',
        name: params.name,
        expiresAt: params.expiresAt
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
    await create.get('select').setValue('201')
    await create.get('input:not([type="datetime-local"])').setValue('Test automation')
    const expiresAt = create.get<HTMLInputElement>('input[type="datetime-local"]').element.value
    await create.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.createAccountAppGrantToken).toHaveBeenCalledWith('grant', {
        oauthClientID: '201',
        tokenType: 'accessToken',
        name: 'Test automation',
        expiresAt: new Date(expiresAt).toISOString()
      })
    )
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Copy access token"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Copy access token"]').trigger('click')
    await vi.waitFor(async () => expect(await navigator.clipboard.readText()).toBe('test-only-access-token'))
    await vi.waitFor(() => expect(wrapper.find('tbody').text()).toContain('Test automation'))
    expect(wrapper.get('tbody a').attributes('href')).toBe('/admin/apps/flight/oauth-clients/201')
    expect(wrapper.get('tbody a').text()).toBe('web')
    expect(wrapper.text()).toContain('App ID: flight')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'I have saved it')!
      .trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Copy access token"]').exists()).toBe(false))
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
    let rejectTokenRevoke: (error: Error) => void = () => {}
    vi.mocked(accountAdminApis.revokeAccountAppGrantToken)
      .mockReturnValueOnce(new Promise((_, reject) => (rejectTokenRevoke = reject)))
      .mockImplementationOnce(async () => {
        tokens = []
      })
    await wrapper
      .get('tbody')
      .findAll('button')
      .find((button) => button.text() === 'Revoke')
      ?.trigger('click')
    const findRevokeDialog = () =>
      wrapper.findAll('[role="dialog"]').find((dialog) => dialog.text().includes('Revoke token'))
    await vi.waitFor(() => expect(findRevokeDialog()).toBeDefined())
    await findRevokeDialog()
      ?.findAll('button')
      .find((button) => button.text() === 'Revoke')
      ?.trigger('click')
    await vi.waitFor(() => expect(accountAdminApis.revokeAccountAppGrantToken).toHaveBeenCalledTimes(1))
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(findRevokeDialog()?.text()).toContain('Revoke token')
    rejectTokenRevoke(new Error('Temporary failure'))
    await flushPromises()
    expect(findRevokeDialog()?.text()).toContain('Revoke token')
    await findRevokeDialog()
      ?.findAll('button')
      .find((button) => button.text() === 'Revoke')
      ?.trigger('click')
    await vi.waitFor(() => expect(findRevokeDialog()).toBeUndefined())
    expect(accountAdminApis.revokeAccountAppGrantToken).toHaveBeenLastCalledWith('grant', 'test-token-id')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No active tokens'))
    let rejectGrantRevoke: (error: Error) => void = () => {}
    vi.mocked(accountAdminApis.revokeAccountAppGrant)
      .mockReturnValueOnce(new Promise((_, reject) => (rejectGrantRevoke = reject)))
      .mockResolvedValueOnce(undefined)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Revoke app authorization...')
      ?.trigger('click')
    const findGrantRevokeDialog = () =>
      wrapper.findAll('[role="dialog"]').find((dialog) => dialog.text().includes('Revoke app authorization'))
    await vi.waitFor(() => expect(findGrantRevokeDialog()).toBeDefined())
    await findGrantRevokeDialog()
      ?.findAll('button')
      .find((button) => button.text() === 'Revoke')
      ?.trigger('click')
    await vi.waitFor(() => expect(accountAdminApis.revokeAccountAppGrant).toHaveBeenCalledTimes(1))
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(findGrantRevokeDialog()).toBeDefined()
    rejectGrantRevoke(new Error('Temporary failure'))
    await flushPromises()
    expect(findGrantRevokeDialog()).toBeDefined()
    await findGrantRevokeDialog()
      ?.findAll('button')
      .find((button) => button.text() === 'Revoke')
      ?.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('This app authorization has been revoked.'))
    expect(findGrantRevokeDialog()).toBeUndefined()
    expect(accountAdminApis.revokeAccountAppGrant).toHaveBeenLastCalledWith('grant')
  })
})
