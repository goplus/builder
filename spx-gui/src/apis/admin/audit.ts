import { client, type ByPage, type PaginationParams } from '@/apis/common'

type SortOrder = 'asc' | 'desc'

export type AuditLog = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Audit action name */
  action: string
  /** Username of the user who performed the action at the time of the audit event */
  actor?: string | null
  /** Type of the audited resource */
  resourceType: string
  /** ID of the audited resource */
  resourceID: string
  /** Additional audit metadata */
  metadata?: Record<string, unknown>
}

export type ListAuditLogsParams = PaginationParams & {
  /** Filter audit logs created after this timestamp */
  createdAfter?: string
  /** Filter audit logs created before this timestamp */
  createdBefore?: string
  /** Field by which to order the results */
  orderBy?: 'createdAt'
  /** Order in which to sort the results */
  sortOrder?: SortOrder
}

export function listAuditLogs(params?: ListAuditLogsParams) {
  return client.get('/admin/audit-logs', params) as Promise<ByPage<AuditLog>>
}
