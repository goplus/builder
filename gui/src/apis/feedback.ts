import { client } from './common'

export const feedbackTitleMaxLength = 100
export const feedbackDescriptionMaxLength = 2000
/** Maximum encoded size of the request body for creating feedback, in bytes */
export const feedbackRequestBodyMaxSize = 256 * 1024

export enum FeedbackStatus {
  /** Awaiting administrator processing */
  New = 'new',
  /** Marked by an administrator as needing no reply */
  Handled = 'handled',
  /** Replied to by an administrator */
  Replied = 'replied'
}

export type FeedbackReply = {
  /** Reply in Markdown, including inline images */
  content: string
  /** Time when the reply was sent */
  createdAt: string
}

export type Feedback = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Username of the user who submitted the feedback */
  owner: string
  /** Summary of the problem */
  title: string
  /** Details about the problem */
  description: string
  /** Diagnostic context shared by the user, omitted if not shared and in feedback lists */
  context?: Record<string, unknown>
  /** Processing status */
  status: FeedbackStatus
  /** Administrator reply, omitted unless the status is `replied`, and in feedback lists */
  reply?: FeedbackReply
}

export type CreateFeedbackParams = Pick<Feedback, 'title' | 'description' | 'context'>

export function createFeedback(params: CreateFeedbackParams) {
  return client.post('/user/feedback', params) as Promise<Feedback>
}
