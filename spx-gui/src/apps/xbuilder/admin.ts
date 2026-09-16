import type { UserCapabilities } from '@/apis/user'

export type AdminConsoleCapabilities = Pick<UserCapabilities, 'canManageAccount' | 'canManageAuthorization'>

export function canUseAdminConsole(capabilities: AdminConsoleCapabilities | null | undefined) {
  return capabilities?.canManageAccount === true || capabilities?.canManageAuthorization === true
}

export function getAdminDefaultRoute(capabilities: AdminConsoleCapabilities | null | undefined) {
  if (capabilities?.canManageAccount === true) return '/admin/users'
  if (capabilities?.canManageAuthorization === true) return '/admin/audit-logs'
  return null
}
