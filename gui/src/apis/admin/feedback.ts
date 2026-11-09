import { client, SortOrder, type ByPage, type PaginationParams } from '@/apis/common'
import type { Feedback, FeedbackReply, FeedbackStatus } from '@/apis/feedback'

export const feedbackReplyContentMaxLength = 1000
export const feedbackReplyAttachmentsMaxCount = 5
export const feedbackReplyAttachmentNameMaxLength = 100

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

export type CreateFeedbackReplyParams = Pick<FeedbackReply, 'content' | 'attachments'>

/** Reply to feedback in the `new` status, which notifies the user who submitted it */
export function createFeedbackReply(id: string, params: CreateFeedbackReplyParams) {
  return client.post(`/admin/feedback/${encodeURIComponent(id)}/reply`, params) as Promise<FeedbackReply>
}
