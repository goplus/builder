export const accountAdminRole = 'accountAdmin'
export const authorizationAdminRole = 'authorizationAdmin'
export const managedAdminRoles = [accountAdminRole, authorizationAdminRole, 'assetAdmin', 'courseAdmin'] as const

export type ManagedAdminRole = (typeof managedAdminRoles)[number]

export function isManagedAdminRole(role: string): role is ManagedAdminRole {
  return managedAdminRoles.includes(role as ManagedAdminRole)
}

export function isAccountAdminRequired(roles: readonly string[]) {
  return roles.includes(authorizationAdminRole)
}

export function normalizeAdminRoles(roles: readonly string[]) {
  const selectedRoles = new Set(roles.filter(isManagedAdminRole))
  if (selectedRoles.has(authorizationAdminRole)) selectedRoles.add(accountAdminRole)
  return managedAdminRoles.filter((role) => selectedRoles.has(role))
}
