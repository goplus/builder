import type { UserCapabilities } from '@/apis/user'

export type AdminConsoleCapabilities = Pick<UserCapabilities, 'canManageAccount' | 'canManageAuthorization'>

export function canReadAdminAuditLogs(capabilities: AdminConsoleCapabilities | null | undefined) {
  return capabilities?.canManageAccount === true || capabilities?.canManageAuthorization === true
}

export function canAccessAdminConsole(capabilities: AdminConsoleCapabilities | null | undefined) {
  return capabilities?.canManageAccount === true || canReadAdminAuditLogs(capabilities)
}

export function getAdminDefaultRoute(capabilities: AdminConsoleCapabilities | null | undefined) {
  if (capabilities?.canManageAccount === true) return '/admin/users'
  if (canReadAdminAuditLogs(capabilities)) return '/admin/audit-logs'
  return null
}
