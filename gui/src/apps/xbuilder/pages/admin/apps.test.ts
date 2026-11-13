import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as accountAdminApis from '@/apis/admin/account'

function registeredApp(): accountAdminApis.AdminAccountApp {
  return {
    id: '20',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    name: 'flight',
    displayName: 'Flight planner',
    avatar: null,
    description: null,
    status: 'active',
    clientCredentialsScopes: []
  }
}

function registeredClient(): accountAdminApis.AccountOAuthClient {
  return {
    id: '201',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
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
}

describe('admin app registration', () => {
  setupPageTests()

  it('creates an app without OAuth settings and leaves the omitted display name to the backend', async () => {
    await signIn({ canManageAccount: true })
    const app = { ...registeredApp(), description: '  Existing description  ' }
    vi.mocked(accountAdminApis.listAccountApps).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.createAccountApp).mockResolvedValue(app)
    vi.mocked(accountAdminApis.getAccountApp).mockResolvedValue(app)
    vi.mocked(accountAdminApis.listAccountOAuthClients).mockResolvedValue({ total: 0, data: [] })
    const { wrapper, router } = await mountPages('/admin/apps')
    await vi.waitFor(() => expect(wrapper.text()).toContain('0 apps'))
    const createButton = wrapper.findAll('button').find((button) => button.text() === 'Create app')
    expect(createButton).toBeDefined()
    await createButton?.trigger('click')
    const create = wrapper.get('form')
    await create.get('input').setValue('flight')
    expect(create.find('select').exists()).toBe(false)
    await create.trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/admin/apps/20'))
    expect(accountAdminApis.createAccountApp).toHaveBeenCalledWith({ name: 'flight', clientCredentialsScopes: [] })
    await vi.waitFor(() => expect(wrapper.text()).toContain('No OAuth clients registered'))
    vi.mocked(accountAdminApis.updateAccountApp).mockResolvedValue({
      ...app,
      displayName: 'Canonical display name',
      status: 'disabled'
    })
    const edit = wrapper.get('form')
    expect(edit.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await edit.get('input').setValue(' New name ')
    await edit.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.updateAccountApp).toHaveBeenCalledWith('20', {
        displayName: 'New name'
      })
    )
    await vi.waitFor(() => expect(wrapper.get('h2').text()).toBe('Canonical display name'))
    expect(edit.get<HTMLInputElement>('input').element.value).toBe('Canonical display name')
    expect(edit.get('button[role="switch"]').attributes('aria-checked')).toBe('false')
  })

  it('preserves app edits when an avatar upload reloads registration data', async () => {
    await signIn({ canManageAccount: true })
    const app = registeredApp()
    const updated: accountAdminApis.AdminAccountApp = {
      ...app,
      displayName: 'Remote display name',
      avatar: 'https://assets.test/app-avatar.png',
      status: 'disabled',
      clientCredentialsScopes: ['account:user:read']
    }
    vi.mocked(accountAdminApis.getAccountApp).mockResolvedValueOnce(app).mockResolvedValue(updated)
    vi.mocked(accountAdminApis.listAccountOAuthClients).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.updateAccountAppAvatar).mockResolvedValue(undefined)
    const { wrapper } = await mountPages('/admin/apps/20')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No OAuth clients registered'))
    const form = wrapper.get('form')
    await form.get('input').setValue('Draft display name')
    await form.get('textarea').setValue('Draft description')
    await form.findAll('button[role="switch"]')[1].trigger('click')
    const inputs = form.findAll('input')
    await inputs[inputs.length - 1].setValue('Directory access for operations')
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    const upload = wrapper.get('input[type="file"]')
    Object.defineProperty(upload.element, 'files', { value: [file] })
    await upload.trigger('change')
    await vi.waitFor(() => expect(wrapper.get('h2').text()).toBe(updated.displayName))
    expect(accountAdminApis.updateAccountAppAvatar).toHaveBeenCalledWith('20', file)
    expect(wrapper.get('img[alt="Remote display name"]').attributes('src')).toBe(updated.avatar)
    const reloadedForm = wrapper.get('form')
    expect(reloadedForm.get<HTMLInputElement>('input').element.value).toBe('Draft display name')
    expect(reloadedForm.get<HTMLTextAreaElement>('textarea').element.value).toBe('Draft description')
    expect(reloadedForm.get('button[role="switch"]').attributes('aria-checked')).toBe('false')
    expect(reloadedForm.findAll('button[role="switch"]')[1].attributes('aria-checked')).toBe('true')
    expect(reloadedForm.findAll('button[role="switch"]')[2].attributes('aria-checked')).toBe('true')
    const saved: accountAdminApis.AdminAccountApp = {
      ...updated,
      displayName: 'Saved display name',
      description: 'Saved description',
      clientCredentialsScopes: ['account:app:read', 'account:user:read']
    }
    vi.mocked(accountAdminApis.updateAccountApp).mockResolvedValue(saved)
    await reloadedForm.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.updateAccountApp).toHaveBeenCalledWith('20', {
        displayName: 'Draft display name',
        description: 'Draft description',
        clientCredentialsScopes: ['account:app:read', 'account:user:read'],
        reason: 'Directory access for operations'
      })
    )
    await vi.waitFor(() => expect(wrapper.get('h2').text()).toBe(saved.displayName))
    expect(reloadedForm.get<HTMLInputElement>('input').element.value).toBe(saved.displayName)
    expect(reloadedForm.get<HTMLTextAreaElement>('textarea').element.value).toBe(saved.description)
  })

  it('preserves description text and does not navigate after the creation page is left', async () => {
    await signIn({ canManageAccount: true })
    vi.mocked(accountAdminApis.listAccountApps).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.getAccountApp).mockResolvedValue({ ...registeredApp(), id: '30' })
    vi.mocked(accountAdminApis.listAccountOAuthClients).mockResolvedValue({ total: 0, data: [] })
    let resolveCreate: (app: accountAdminApis.AdminAccountApp) => void = () => {}
    vi.mocked(accountAdminApis.createAccountApp).mockReturnValueOnce(
      new Promise((resolve) => (resolveCreate = resolve))
    )
    const { wrapper, router } = await mountPages('/admin/apps')
    await vi.waitFor(() => expect(wrapper.text()).toContain('0 apps'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create app')
      ?.trigger('click')
    const form = wrapper.get('form')
    await form.get('input').setValue('flight')
    await form.get('textarea').setValue('  App description  ')
    await form.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.createAccountApp).toHaveBeenCalledWith({
        name: 'flight',
        description: '  App description  ',
        clientCredentialsScopes: []
      })
    )
    await router.push('/admin/apps/30')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No OAuth clients registered'))
    resolveCreate(registeredApp())
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/apps/30')
  })

  it('approves app-only permissions when registering an app without clients', async () => {
    await signIn({ canManageAccount: true })
    const app: accountAdminApis.AdminAccountApp = { ...registeredApp(), clientCredentialsScopes: ['account:app:read'] }
    vi.mocked(accountAdminApis.listAccountApps).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.createAccountApp).mockResolvedValue(app)
    vi.mocked(accountAdminApis.getAccountApp).mockResolvedValue(app)
    vi.mocked(accountAdminApis.listAccountOAuthClients).mockResolvedValue({ total: 0, data: [] })
    const { wrapper, router } = await mountPages('/admin/apps')
    await vi.waitFor(() => expect(wrapper.text()).toContain('0 apps'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create app')
      ?.trigger('click')
    const form = wrapper.get('form')
    await form.get('input').setValue('flight')
    await form.findAll('button[role="switch"]')[0].trigger('click')
    expect(form.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    const inputs = form.findAll('input')
    await inputs[inputs.length - 1].setValue('Read the app directory')
    await form.trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/admin/apps/20'))
    expect(accountAdminApis.createAccountApp).toHaveBeenCalledWith({
      name: 'flight',
      clientCredentialsScopes: ['account:app:read'],
      reason: 'Read the app directory'
    })
    expect(accountAdminApis.createAccountOAuthClient).not.toHaveBeenCalled()
  })

  it('requires a reason to remove app-only permissions and accepts canonical state', async () => {
    await signIn({ canManageAccount: true })
    const app: accountAdminApis.AdminAccountApp = { ...registeredApp(), clientCredentialsScopes: ['account:app:read'] }
    const updated = { ...registeredApp(), updatedAt: '2026-01-02T00:00:00Z' }
    vi.mocked(accountAdminApis.getAccountApp).mockResolvedValue(app)
    vi.mocked(accountAdminApis.listAccountOAuthClients).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.updateAccountApp).mockResolvedValue(updated)
    const { wrapper } = await mountPages('/admin/apps/20')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No OAuth clients registered'))
    const form = wrapper.get('form')
    await form.findAll('button[role="switch"]')[1].trigger('click')
    expect(form.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    const inputs = form.findAll('input')
    await inputs[inputs.length - 1].setValue('No longer needs directory access')
    await form.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.updateAccountApp).toHaveBeenCalledWith('20', {
        clientCredentialsScopes: [],
        reason: 'No longer needs directory access'
      })
    )
    await vi.waitFor(() => expect(form.get('button[type="submit"]').attributes('disabled')).toBeDefined())
    expect(form.findAll('button[role="switch"]')[1].attributes('aria-checked')).toBe('false')
  })

  it('creates an app-only client without a separate permission approval', async () => {
    await signIn({ canManageAccount: true })
    vi.mocked(accountAdminApis.getAccountApp).mockResolvedValue(registeredApp())
    vi.mocked(accountAdminApis.listAccountOAuthClients).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.createAccountOAuthClient).mockResolvedValue(registeredClient())
    const { wrapper } = await mountPages('/admin/apps/20')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Create client...'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create client...')
      ?.trigger('click')
    const form = wrapper.findAll('form').find((candidate) => candidate.text().includes('Management name'))
    expect(form).toBeDefined()
    await form?.get('input').setValue('backend')
    await form?.get('select').setValue('client_credentials')
    const switches = form?.findAll('button[role="switch"]') ?? []
    expect(switches).toHaveLength(0)
    const inputs = form?.findAll('input') ?? []
    await inputs[inputs.length - 1].setValue('Read the app directory')
    await form?.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.createAccountOAuthClient).toHaveBeenCalledWith('20', {
        name: 'backend',
        clientType: 'confidential',
        grantTypes: ['client_credentials'],
        redirectURIs: [],
        reason: 'Read the app directory'
      })
    )
  })
})

describe('admin OAuth client', () => {
  setupPageTests()

  it('keeps a completed secret request with the client page that started it', async () => {
    await signIn({ canManageAccount: true })
    const first = registeredClient()
    const second = { ...first, id: '202', clientID: 'another-public-client', name: 'operations' }
    vi.mocked(accountAdminApis.getAccountOAuthClient).mockImplementation(async (_appID, id) =>
      id === first.id ? first : second
    )
    vi.mocked(accountAdminApis.listAccountOAuthClientSecrets).mockResolvedValue({ total: 0, data: [] })
    let resolveSecret: (secret: accountAdminApis.CreatedAccountOAuthClientSecret) => void = () => {}
    vi.mocked(accountAdminApis.createAccountOAuthClientSecret).mockReturnValueOnce(
      new Promise((resolve) => (resolveSecret = resolve))
    )
    const { wrapper, router } = await mountPages('/admin/apps/20/oauth-clients/201')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Client secrets'))
    const form = wrapper.findAll('form').find((candidate) => candidate.text().includes('Create secret'))
    await form?.get('input').setValue('deployment')
    await form?.trigger('submit')
    await vi.waitFor(() => expect(accountAdminApis.createAccountOAuthClientSecret).toHaveBeenCalledTimes(1))
    await router.push('/admin/apps/20/oauth-clients/202')
    await vi.waitFor(() => expect(wrapper.get('h2').text()).toBe('operations'))
    resolveSecret({ id: '91', createdAt: first.createdAt, name: 'deployment', value: 'first-client-secret' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('first-client-secret')
    expect(accountAdminApis.createAccountOAuthClientSecret).toHaveBeenCalledWith('20', '201', { name: 'deployment' })
  })

  it('does not load client configuration without Account admin permission', async () => {
    await signIn({ canManageAccount: false })
    const { wrapper } = await mountPages('/admin/apps/20/oauth-clients/201')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Access denied'))
    expect(accountAdminApis.getAccountOAuthClient).not.toHaveBeenCalled()
    expect(accountAdminApis.listAccountOAuthClientSecrets).not.toHaveBeenCalled()
  })

  it('uses the management ID for configuration and keeps the protocol ID distinct', async () => {
    await signIn({ canManageAccount: true })
    const client = registeredClient()
    vi.mocked(accountAdminApis.getAccountOAuthClient).mockResolvedValue(client)
    vi.mocked(accountAdminApis.listAccountOAuthClientSecrets).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.updateAccountOAuthClient).mockResolvedValue({ ...client, status: 'disabled' })
    const { wrapper } = await mountPages('/admin/apps/20/oauth-clients/201')
    await vi.waitFor(() => expect(wrapper.text()).toContain(client.clientID))
    expect(accountAdminApis.getAccountOAuthClient).toHaveBeenCalledWith('20', '201')
    const form = wrapper.findAll('form')[0]
    const switches = form.findAll('button[role="switch"]')
    expect(switches).toHaveLength(1)
    await switches[0].trigger('click')
    await form.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.updateAccountOAuthClient).toHaveBeenCalledWith('20', '201', {
        status: 'disabled'
      })
    )
    expect(wrapper.text()).toContain(client.clientID)
  })

  it('returns to the first page after revoking the last secret on another page', async () => {
    await signIn({ canManageAccount: true })
    vi.mocked(accountAdminApis.getAccountOAuthClient).mockResolvedValue(registeredClient())
    const secrets = Array.from({ length: 21 }, (_, index) => ({
      id: String(301 + index),
      createdAt: '2026-01-01T00:00:00Z',
      name: `Deployment ${index + 1}`
    }))
    vi.mocked(accountAdminApis.listAccountOAuthClientSecrets).mockImplementation(async (_appID, _clientID, params) => {
      const pageSize = params?.pageSize ?? 20
      const start = ((params?.pageIndex ?? 1) - 1) * pageSize
      return { total: secrets.length, data: secrets.slice(start, start + pageSize) }
    })
    vi.mocked(accountAdminApis.revokeAccountOAuthClientSecret).mockImplementation(async () => {
      secrets.pop()
    })
    const { wrapper } = await mountPages('/admin/apps/20/oauth-clients/201')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Deployment 20'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '2')
      ?.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Deployment 21'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Revoke...')
      ?.trigger('click')
    const findRevokeDialog = () =>
      wrapper.findAll('[role="dialog"]').find((dialog) => dialog.text().includes('Revoke client secret'))
    await vi.waitFor(() => expect(findRevokeDialog()).toBeDefined())
    await findRevokeDialog()
      ?.findAll('button')
      .find((button) => button.text() === 'Revoke')
      ?.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Deployment 1'))
    expect(wrapper.text()).not.toContain('Deployment 21')
    expect(accountAdminApis.revokeAccountOAuthClientSecret).toHaveBeenCalledWith('20', '201', '321')
    expect(accountAdminApis.listAccountOAuthClientSecrets).toHaveBeenLastCalledWith('20', '201', {
      pageIndex: 1,
      pageSize: 20
    })
  })

  it('shows a secret once and keeps its revoke dialog open during the request and after failure', async () => {
    await signIn({ canManageAccount: true })
    vi.mocked(accountAdminApis.getAccountOAuthClient).mockResolvedValue(registeredClient())
    const secret = { id: '91', createdAt: '2026-01-01T00:00:00Z', name: 'Deployment' }
    const createdSecret = { ...secret, value: 'one-time-secret-value' }
    vi.mocked(accountAdminApis.listAccountOAuthClientSecrets).mockResolvedValue({ total: 1, data: [secret] })
    vi.mocked(accountAdminApis.createAccountOAuthClientSecret).mockResolvedValue(createdSecret)
    let rejectRevoke: (error: Error) => void = () => {}
    vi.mocked(accountAdminApis.revokeAccountOAuthClientSecret)
      .mockReturnValueOnce(new Promise((_, reject) => (rejectRevoke = reject)))
      .mockResolvedValueOnce(undefined)
    const { wrapper } = await mountPages('/admin/apps/20/oauth-clients/201')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Client secrets'))
    const form = wrapper.findAll('form').find((candidate) => candidate.text().includes('Create secret'))
    await form?.get('input').setValue('Deployment')
    await form?.trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain(createdSecret.value))
    await wrapper.get('[aria-label="Copy client secret"]').trigger('click')
    await vi.waitFor(async () => expect(await navigator.clipboard.readText()).toBe(createdSecret.value))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Revoke...')
      ?.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Revoke client secret'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Revoke')
      ?.trigger('click')
    await vi.waitFor(() => expect(accountAdminApis.revokeAccountOAuthClientSecret).toHaveBeenCalledTimes(1))
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(wrapper.text()).toContain('Revoke client secret')
    rejectRevoke(new Error('Temporary failure'))
    await flushPromises()
    expect(wrapper.text()).toContain('Revoke client secret')
    expect(wrapper.text()).toContain(createdSecret.value)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Revoke')
      ?.trigger('click')
    await vi.waitFor(() => expect(accountAdminApis.revokeAccountOAuthClientSecret).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(wrapper.text()).not.toContain(createdSecret.value))
    expect(accountAdminApis.revokeAccountOAuthClientSecret).toHaveBeenLastCalledWith('20', '201', '91')
  })
})
