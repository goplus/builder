import { describe, expect, it } from 'vitest'

import { canUseAdminConsole, getAdminDefaultRoute } from './admin'

describe('Admin Console access', () => {
  it.each([
    {
      name: 'no management capability',
      capabilities: { canManageAccount: false, canManageAuthorization: false },
      canAccess: false,
      defaultRoute: null
    },
    {
      name: 'Account management only',
      capabilities: { canManageAccount: true, canManageAuthorization: false },
      canAccess: true,
      defaultRoute: '/admin/users'
    },
    {
      name: 'Authorization management only',
      capabilities: { canManageAccount: false, canManageAuthorization: true },
      canAccess: true,
      defaultRoute: '/admin/audit-logs'
    },
    {
      name: 'Account and Authorization management',
      capabilities: { canManageAccount: true, canManageAuthorization: true },
      canAccess: true,
      defaultRoute: '/admin/users'
    }
  ])('$name', ({ capabilities, canAccess, defaultRoute }) => {
    expect(canUseAdminConsole(capabilities)).toBe(canAccess)
    expect(getAdminDefaultRoute(capabilities)).toBe(defaultRoute)
  })
})
