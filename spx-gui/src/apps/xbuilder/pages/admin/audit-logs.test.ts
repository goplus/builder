import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as auditApis from '@/apis/admin/audit'

describe('admin audit logs', () => {
  setupPageTests()

  it('filters audit logs by creation date and displays operation metadata', async () => {
    await signIn({ canManageAuthorization: true })
    vi.mocked(auditApis.listAuditLogs).mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'audit',
          actor: 'alice',
          action: 'account.app.update',
          resourceType: 'app',
          resourceID: 'flight',
          createdAt: '2026-01-02T00:00:00Z',
          metadata: { displayName: 'Space planner' }
        }
      ]
    })
    const { wrapper, router } = await mountPages('/admin')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/admin/audit-logs'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('account.app.update'))
    await wrapper.findAll('input[type="datetime-local"]')[0].setValue('2026-01-01T00:00')
    await vi.waitFor(() =>
      expect(auditApis.listAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ createdAfter: new Date('2026-01-01T00:00').toISOString() })
      )
    )
    expect(wrapper.get('details').text()).toContain('Space planner')
    const calls = vi.mocked(auditApis.listAuditLogs).mock.calls.length
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Refresh')!
      .trigger('click')
    await vi.waitFor(() => expect(auditApis.listAuditLogs).toHaveBeenCalledTimes(calls + 1))
  })
})
