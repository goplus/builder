import { afterEach, describe, expect, it, vi } from 'vitest'

import { client } from '@/apis/common'
import {
  createAccountApp,
  createAccountOAuthClientSecret,
  getAccountOAuthClient,
  revokeAccountOAuthClientSecret,
  updateAccountApp
} from './account'

afterEach(() => vi.restoreAllMocks())

describe('Account registration adapters', () => {
  const app = {
    id: '20',
    createdAt: '2026-10-21T00:00:00Z',
    updatedAt: '2026-10-21T00:00:00Z',
    name: 'orders',
    displayName: 'orders',
    avatar: null,
    description: null,
    status: 'active',
    clientCredentialsScopes: []
  }

  it('keeps omitted creation fields absent and accepts the canonical registration', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue(app)
    await expect(createAccountApp({ name: 'orders' })).resolves.toEqual(app)
    expect(post).toHaveBeenCalledWith('/admin/account/apps', { name: 'orders' })
  })

  it('preserves null when clearing a description and returns backend state', async () => {
    const canonical = { ...app, updatedAt: '2026-10-22T00:00:00Z' }
    const patch = vi.spyOn(client, 'patch').mockResolvedValue(canonical)
    await expect(updateAccountApp('20', { description: null })).resolves.toEqual(canonical)
    expect(patch).toHaveBeenCalledWith('/admin/account/apps/20', { description: null })
  })

  it('sends an empty scope set as a target state', async () => {
    const patch = vi.spyOn(client, 'patch').mockResolvedValue(app)
    const updated = await updateAccountApp('20', {
      clientCredentialsScopes: [],
      reason: 'Access removed'
    })
    expect(updated.clientCredentialsScopes).toEqual([])
    expect(patch).toHaveBeenCalledWith('/admin/account/apps/20', {
      clientCredentialsScopes: [],
      reason: 'Access removed'
    })
  })
})

describe('OAuth client adapters', () => {
  const oauthClient = {
    id: '201',
    createdAt: '2026-10-21T00:00:00Z',
    updatedAt: '2026-10-21T00:00:00Z',
    appID: '20',
    clientID: 'K7mR2qV9sT4wX6yZ8aB0Cg',
    name: 'backend',
    clientType: 'confidential',
    status: 'active',
    grantTypes: ['client_credentials'],
    redirectURIs: [],
    redirectURIPatterns: [],
    wechatReturnTargets: []
  }

  it('addresses configuration with the management ID and preserves the protocol ID', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue(oauthClient)
    const loaded = await getAccountOAuthClient('20', '201')
    expect(get).toHaveBeenCalledWith('/admin/account/apps/20/oauth-clients/201')
    expect(loaded.id).toBe('201')
    expect(loaded.clientID).toBe(oauthClient.clientID)
    expect(loaded.appID).toBe('20')
  })

  it('keeps credential creation and revocation under the owning client', async () => {
    const secret = { id: '301', createdAt: oauthClient.createdAt, name: 'deployment', value: 'one-time-secret' }
    const post = vi.spyOn(client, 'post').mockResolvedValue(secret)
    const remove = vi.spyOn(client, 'delete').mockResolvedValue(undefined)
    await expect(createAccountOAuthClientSecret('20', '201', { name: 'deployment' })).resolves.toEqual(secret)
    expect(post).toHaveBeenCalledWith('/admin/account/apps/20/oauth-clients/201/secrets', { name: 'deployment' })
    await revokeAccountOAuthClientSecret('20', '201', '301')
    expect(remove).toHaveBeenCalledWith('/admin/account/apps/20/oauth-clients/201/secrets/301')
  })
})
