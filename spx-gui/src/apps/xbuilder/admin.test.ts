import { describe, expect, it } from 'vitest'

import { canAccessAdminConsole, canReadAdminAuditLogs, getAdminDefaultRoute } from './admin'

describe('Admin Console access', () => {
  it.each([
    {
      name: 'no management capability',
      capabilities: { canManageAccount: false, canManageAuthorization: false },
      canAccess: false,
      canReadAuditLogs: false,
      defaultRoute: null
    },
    {
      name: 'Account management only',
      capabilities: { canManageAccount: true, canManageAuthorization: false },
      canAccess: true,
      canReadAuditLogs: true,
      defaultRoute: '/admin/users'
    },
    {
      name: 'Authorization management only',
      capabilities: { canManageAccount: false, canManageAuthorization: true },
      canAccess: true,
      canReadAuditLogs: true,
      defaultRoute: '/admin/audit-logs'
    },
    {
      name: 'Account and Authorization management',
      capabilities: { canManageAccount: true, canManageAuthorization: true },
      canAccess: true,
      canReadAuditLogs: true,
      defaultRoute: '/admin/users'
    }
  ])('$name', ({ capabilities, canAccess, canReadAuditLogs, defaultRoute }) => {
    expect(canAccessAdminConsole(capabilities)).toBe(canAccess)
    expect(canReadAdminAuditLogs(capabilities)).toBe(canReadAuditLogs)
    expect(getAdminDefaultRoute(capabilities)).toBe(defaultRoute)
  })
})
