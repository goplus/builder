import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as accountAdminApis from '@/apis/admin/account'

describe('admin users', () => {
  setupPageTests()

  it('filters account users and preserves the query when paging', async () => {
    await signIn({ canManageAccount: true })
    const user = {
      id: 'pilot',
      username: 'pilot',
      displayName: 'Space pilot',
      avatar: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
    vi.mocked(accountAdminApis.listAccountUsers).mockResolvedValue({ total: 21, data: [user] })
    const { wrapper, router } = await mountPages('/admin')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/admin/users'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Space pilot'))
    await wrapper.get('input[placeholder="Username or display name"]').setValue('pilot')
    await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBe('pilot'))
    await vi.waitFor(() =>
      expect(accountAdminApis.listAccountUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: 'pilot', pageIndex: 1 })
      )
    )
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '2')!
      .trigger('click')
    await vi.waitFor(() =>
      expect(accountAdminApis.listAccountUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: 'pilot', pageIndex: 2 })
      )
    )
    expect(wrapper.get('a[href="/admin/users/pilot"]').text()).toContain('Space pilot')
    await wrapper.get('select').setValue('asc')
    await vi.waitFor(() =>
      expect(accountAdminApis.listAccountUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: 'pilot', pageIndex: 1, sortOrder: 'asc' })
      )
    )

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Refresh')!
      .trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Space pilot'))
  })
})
