import type { ByPage, PaginationParams } from './common'
import { client, ownerAll, Visibility } from './common'
import { ApiException, ApiExceptionCode } from './common/exception'

export { Visibility, ownerAll }

export type RecordData = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Unique username of the user who created the recording */
  owner: string
  /** Full name of the project, in the format `owner/project` */
  projectFullName: string
  /** Display title of the recording */
  title: string
  /** Brief description of the recording */
  description: string
  /** Web URL of the recorded video file */
  videoUrl: string
  /** Web URL of the thumbnail image */
  thumbnailUrl: string
  /** Number of times the recording has been viewed */
  viewCount: number
  /** Number of likes the recording has received */
  likeCount: number
}

export type CreateRecordParams = {
  /** Full name of the project that the recording is associated with */
  projectFullName: string
  /** Display title of the recording */
  title: string
  /** Brief description of the recording */
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
   * Filter recordings by the owner's username.
   * Defaults to the authenticated user if not specified. Use * to include recordings from all users.
   **/
  owner?: string
  /** Filter recordings by associated project (format: owner/project) */
  projectFullName?: string
  /** Filter recordings by name pattern */
  keyword?: string
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'likedAt'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
  /** Filter recordings liked by the specified user */
  liker?: string
}

export async function listRecord(params?: ListRecordParams) {
  return client.get('/recordings/list', params) as Promise<ByPage<RecordData>>
}

export async function getRecord(id: string, signal?: AbortSignal) {
  return client.get(`/recording/${id}`, undefined, { signal }) as Promise<RecordData>
}

/** Record a view for the given recording */
export async function recordRecordView(id: string) {
  return client.post(`/recording/${id}/view`) as Promise<void>
}

/**
 * Check if given recording liked by current logged-in user.
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

/** Like given recording as current logged-in user */
export async function likeRecord(id: string) {
  return client.post(`/recording/${id}/liking`) as Promise<void>
}

/** Unlike given recording as current logged-in user */
export async function unlikeRecord(id: string) {
  return client.delete(`/recording/${id}/liking`) as Promise<void>
}
