import type { ByPage, PaginationParams } from '../../../apis/common'
import { client, ownerAll, Visibility } from '../../../apis/common'
import { ApiException, ApiExceptionCode } from '../../../apis/common/exception'

export { Visibility, ownerAll }

export type RecordData = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Unique username of the user who created the record */
  owner: string
  /** Full name of the project, in the format `owner/project` */
  projectFullName: string
  /** Display title of the record */
  title: string
  /** Brief description of the record */
  description: string
  /** URL of the recorded video file */
  videoUrl: string
  /** URL of the thumbnail image */
  thumbnailUrl: string
  /** Number of times the record has been viewed */
  viewCount: number
  /** Number of likes the record has received */
  likeCount: number
}

export type CreateRecordParams = {
  /** Full name of the project that the record is associated with */
  projectFullName: string
  /** Display title of the record */
  title: string
  /** Brief description of the record */
  description: string
  /** URL of the recorded video file */
  videoUrl: string
  /** URL of the thumbnail image */
  thumbnailUrl: string
}

export async function createRecord(params: CreateRecordParams, signal?: AbortSignal) {
  return client.post('/recordings', params, { signal }) as Promise<RecordData>
}

export type UpdateRecordParams = Partial<Pick<RecordData, 'title' | 'description'>>

export async function updateRecord(id: string, params: UpdateRecordParams, signal?: AbortSignal) {
  return client.put(`/recording/${id}`, params, { signal }) as Promise<RecordData>
}

export function deleteRecord(id: string) {
  return client.delete(`/recording/${id}`) as Promise<void>
}

export type ListRecordParams = PaginationParams & {
  /**
   * Filter records by the owner's username.
   * Defaults to the authenticated user if not specified. Use * to include records from all users.
   **/
  owner?: string
  /** Filter records by associated project (format: owner/project) */
  projectFullName?: string
  /** Filter records by name pattern */
  keyword?: string
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'likedAt'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
  /** Filter records liked by the specified user */
  liker?: string
}

export async function listRecord(params?: ListRecordParams) {
  return client.get('/recordings/list', params) as Promise<ByPage<RecordData>>
}

export async function getRecord(id: string, signal?: AbortSignal) {
  return client.get(`/recording/${id}`, undefined, { signal }) as Promise<RecordData>
}

/** Record a view for the given record */
export async function recordRecordView(id: string) {
  return client.post(`/recording/${id}/view`) as Promise<void>
}

/**
 * Check if given record liked by current logged-in user.
 * If not logged in, `false` will be returned.
 */
export async function isLikingRecord(id: string) {
  try {
    await client.get(`/recording/${id}/liking`)
    return true
  } catch (e) {
    if (e instanceof ApiException) {
      // Not liked.
      if (e.code === ApiExceptionCode.errorNotFound) return false
      // Not logged in.
      if (e.code === ApiExceptionCode.errorUnauthorized) return false
      throw e
    }
    return false
  }
}

/** Like given record as current logged-in user */
export async function likeRecord(id: string) {
  return client.post(`/recording/${id}/liking`) as Promise<void>
}

/** Unlike given record as current logged-in user */
export async function unlikeRecord(id: string) {
  return client.delete(`/recording/${id}/liking`) as Promise<void>
}
