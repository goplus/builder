import { describe, expect, it } from 'vitest'

import { isAccountAdminRequired, normalizeAdminRoles } from './authorization-role'

describe('Admin authorization role dependency', () => {
  it('adds Account admin when Authorization admin is selected', () => {
    expect(normalizeAdminRoles(['authorizationAdmin'])).toEqual(['accountAdmin', 'authorizationAdmin'])
  })

  it('keeps independent admin roles unchanged', () => {
    expect(normalizeAdminRoles(['accountAdmin', 'assetAdmin'])).toEqual(['accountAdmin', 'assetAdmin'])
  })

  it('ignores roles not managed by the Account authorization form', () => {
    expect(normalizeAdminRoles(['unknownRole', 'courseAdmin'])).toEqual(['courseAdmin'])
  })

  it('requires Account admin only while Authorization admin is selected', () => {
    expect(isAccountAdminRequired(['authorizationAdmin'])).toBe(true)
    expect(isAccountAdminRequired(['accountAdmin', 'assetAdmin'])).toBe(false)
  })
})
