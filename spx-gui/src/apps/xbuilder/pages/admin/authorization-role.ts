export const accountAdminRoles = ['accountAdmin', 'authorizationAdmin', 'assetAdmin', 'courseAdmin'] as const

export type AccountAdminRole = (typeof accountAdminRoles)[number]

export function isAccountAdminRole(role: string): role is AccountAdminRole {
  return accountAdminRoles.includes(role as AccountAdminRole)
}

export function isAccountAdminRequired(roles: readonly string[]) {
  return roles.includes('authorizationAdmin')
}

export function normalizeAdminRoles(roles: readonly string[]) {
  const selectedRoles = new Set(roles.filter(isAccountAdminRole))
  if (selectedRoles.has('authorizationAdmin')) selectedRoles.add('accountAdmin')
  return accountAdminRoles.filter((role) => selectedRoles.has(role))
}
