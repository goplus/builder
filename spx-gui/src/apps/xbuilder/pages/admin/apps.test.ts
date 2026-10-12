import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as accountAdminApis from '@/apis/admin/account'

describe('admin apps', () => {
  setupPageTests()

  it('creates an OAuth app and saves its identity, endpoints and availability', async () => {
    await signIn({ canManageAccount: true })
    let app: accountAdminApis.AccountApp = {
      id: 'flight',
      name: 'flight',
      displayName: 'Flight planner',
      clientType: 'confidential',
      status: 'active',
      redirectURIs: ['https://flight.test/callback'],
      redirectURIPatterns: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
    vi.mocked(accountAdminApis.listAccountApps).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.createAccountApp).mockResolvedValue(app)
    vi.mocked(accountAdminApis.getAccountApp).mockImplementation(async () => app)
    vi.mocked(accountAdminApis.listAccountAppSecrets).mockResolvedValue({ total: 0, data: [] })
    vi.mocked(accountAdminApis.updateAccountApp).mockImplementation(async (_id, params) => {
      app = { ...app, ...params }
      return app
    })
    const { wrapper, router } = await mountPages('/admin/apps')
    await vi.waitFor(() => expect(wrapper.text()).toContain('0 apps'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create app')!
      .trigger('click')
    const create = wrapper.get('form')
    const inputs = create.findAll('input')
    await inputs[0].setValue('flight')
    await inputs[1].setValue('Flight planner')
    await create.get('select').setValue('confidential')
    await create.get('textarea').setValue(' https://flight.test/callback\n\n')
    await create.trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/admin/apps/flight'))
    expect(accountAdminApis.createAccountApp).toHaveBeenCalledWith({
      name: 'flight',
      displayName: 'Flight planner',
      clientType: 'confidential',
      redirectURIs: ['https://flight.test/callback']
    })
    await vi.waitFor(() => expect(wrapper.findAll('form').length).toBe(3))
    const identity = wrapper.findAll('form').find((form) => form.text().includes('Save changes'))!
    await identity.get('input').setValue(' Space planner ')
    await identity.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.updateAccountApp).toHaveBeenCalledWith('flight', { displayName: 'Space planner' })
    )
    await vi.waitFor(() => expect(identity.get('button[type="submit"]').attributes('disabled')).toBeDefined())
    const endpoints = wrapper.findAll('form').find((form) => form.text().includes('Save endpoint settings'))!
    await endpoints.get('textarea').setValue('https://flight.test/callback\n https://flight.test/return ')
    await endpoints.trigger('submit')
    await vi.waitFor(() =>
      expect(accountAdminApis.updateAccountApp).toHaveBeenCalledWith('flight', {
        redirectURIs: ['https://flight.test/callback', 'https://flight.test/return']
      })
    )
    await wrapper.get('[aria-label="App availability"]').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save availability')!
      .trigger('click')
    await vi.waitFor(() =>
      expect(accountAdminApis.updateAccountApp).toHaveBeenCalledWith('flight', { status: 'disabled' })
    )
    const secretForm = wrapper.findAll('form').find((form) => form.text().includes('Create secret'))!
    const secret = {
      id: 'test-secret-id',
      name: 'Test deployment',
      value: 'test-only-secret',
      createdAt: '2026-01-01T00:00:00Z'
    }
    vi.mocked(accountAdminApis.createAccountAppSecret).mockResolvedValue(secret)
    vi.mocked(accountAdminApis.listAccountAppSecrets).mockResolvedValue({ total: 1, data: [secret] })
    await secretForm.get('input').setValue('Test deployment')
    await secretForm.trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Copy app secret"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Copy app secret"]').trigger('click')
    await vi.waitFor(async () => expect(await navigator.clipboard.readText()).toBe('test-only-secret'))
    expect(accountAdminApis.createAccountAppSecret).toHaveBeenCalledWith('flight', { name: 'Test deployment' })
  })
})
