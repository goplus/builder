import { client, SortOrder, type ByPage, type PaginationParams } from '@/apis/common'
import type { Feedback, FeedbackStatus } from '@/apis/feedback'

export type ListFeedbackParams = PaginationParams & {
  /** Filter feedback by status */
  status?: FeedbackStatus
  /** Field by which to order the results */
  orderBy?: 'createdAt'
  /** Order in which to sort the results */
  sortOrder?: SortOrder
}

export function listFeedback(params?: ListFeedbackParams) {
  return client.get('/admin/feedback', params) as Promise<ByPage<Feedback>>
}

export function getFeedback(id: string) {
  return client.get(`/admin/feedback/${encodeURIComponent(id)}`) as Promise<Feedback>
}

export type UpdateFeedbackParams = {
  status: FeedbackStatus.Handled
}

export function updateFeedback(id: string, params: UpdateFeedbackParams) {
  return client.patch(`/admin/feedback/${encodeURIComponent(id)}`, params) as Promise<Feedback>
}
