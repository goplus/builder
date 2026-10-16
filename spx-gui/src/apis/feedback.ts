import { client } from './common'

export const feedbackTitleMaxLength = 100
export const feedbackDescriptionMaxLength = 2000
/** Maximum encoded size of the request body for creating feedback, in bytes */
export const feedbackRequestBodyMaxSize = 256 * 1024

export enum FeedbackStatus {
  /** Awaiting administrator processing */
  New = 'new',
  /** Marked as handled by an administrator */
  Handled = 'handled'
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
  /** Diagnostic context shared by the user, omitted if not shared */
  context?: Record<string, unknown>
  /** Processing status */
  status: FeedbackStatus
}

export type CreateFeedbackParams = Pick<Feedback, 'title' | 'description' | 'context'>

export function createFeedback(params: CreateFeedbackParams) {
  return client.post('/user/feedback', params) as Promise<Feedback>
}
