import type { ByPage, PaginationParams } from '../../../spx-gui/src/apis/common'
import { client, ownerAll, Visibility } from '../../../spx-gui/src/apis/common'
import { ApiException, ApiExceptionCode } from '../../../spx-gui/src/apis/common/exception'
import type { ProjectData } from '../../../spx-gui/src/apis/project'

export { ownerAll }

export type RecordData = {
    /** Unique identifier */
    id: string
    /** Creation timestamp */
    createdAt: string
    /** Last update timestamp */
    updatedAt: string
    /** Unique username of the user who created the record */
    owner: string
    /** ID of the associated project */
    projectId: number
    /** Associated project data (optional, included in some contexts) */
    project?: ProjectData
    /** Unique name of the record under the user */
    name: string
    /** Display title of the record */
    title: string
    /** Brief description of the record */
    description: string
    /** URL of the recorded video file */
    videoUrl: string
    /** URL of the thumbnail image */
    thumbnailUrl: string
    /** Duration of the video in seconds */
    duration: number
    /** Size of the video file in bytes */
    fileSize: number
    /** Visibility of the record */
    visibility: Visibility
    /** Number of times the record has been viewed */
    viewCount: number
    /** Number of likes the record has received */
    likeCount: number
}

export type CreateRecordParams = {
    /** ID of the project that the record is associated with */
    projectId: number
    /** Unique name of the record under the user */
    name: string
    /** Display title of the record */
    title: string
    /** Brief description of the record */
    description: string
    /** URL of the recorded video file */
    videoUrl: string
    /** URL of the thumbnail image */
    thumbnailUrl: string
    /** Duration of the video in seconds */
    duration: number
    /** Size of the video file in bytes */
    fileSize: number
}

export type UpdateRecordParams = Partial<Pick<RecordData, 'title' | 'description' | 'visibility'>>

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
    orderBy?: 'createdAt' | 'updatedAt' | 'duration' | 'viewCount' | 'likeCount' | 'likedAt'
    /** Order in which to sort the results */
    sortOrder?: 'asc' | 'desc'
    /** Filter records liked by the specified user */
    liker?: string
}

// ============================================================================
// Helper functions: for constructing record-related URLs
// ============================================================================

export function parseRecordFullName(fullName: string) {
    const [encodedOwner, encodedName] = fullName.split('/')
    const owner = decodeURIComponent(encodedOwner)
    const name = decodeURIComponent(encodedName)
    return { owner, name }
}

export function stringifyRecordFullName(owner: string, name: string) {
    const encodedOwner = encodeURIComponent(owner)
    const encodedName = encodeURIComponent(name)
    return `${encodedOwner}/${encodedName}`
}

/**
 * Internal helper function: construct record API URL path
 * @param owner Record owner username
 * @param name Record name
 * @param suffix URL suffix (e.g. '/view', '/liking', etc.)
 * @returns Complete API path
 */
function buildRecordUrl(owner: string, name: string, suffix: string = ''): string {
    const fullName = stringifyRecordFullName(owner, name)
    return `/record/${fullName}${suffix}`
}

// ============================================================================
// API Functions
// ============================================================================

export async function createRecord(params: CreateRecordParams, signal?: AbortSignal) {
    return client.post('/records', params, { signal }) as Promise<RecordData>
}

export async function updateRecord(owner: string, name: string, params: UpdateRecordParams, signal?: AbortSignal) {
    return client.put(buildRecordUrl(owner, name), params, {
        signal
    }) as Promise<RecordData>
}

export function deleteRecord(owner: string, name: string) {
    return client.delete(buildRecordUrl(owner, name)) as Promise<void>
}

export async function listRecord(params?: ListRecordParams) {
    return client.get('/records/list', params) as Promise<ByPage<RecordData>>
}

export async function getRecord(owner: string, name: string, signal?: AbortSignal) {
    return client.get(buildRecordUrl(owner, name), undefined, {
        signal
    }) as Promise<RecordData>
}

/** Record a view for the given record */
export async function recordRecordView(owner: string, name: string) {
    return client.post(buildRecordUrl(owner, name, '/view')) as Promise<void>
}

/**
 * Check if given record liked by current logged-in user.
 * If not logged in, `false` will be returned.
 */
export async function isLikingRecord(owner: string, name: string) {
    try {
        await client.get(buildRecordUrl(owner, name, '/liking'))
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
export async function likeRecord(owner: string, name: string) {
    return client.post(buildRecordUrl(owner, name, '/liking')) as Promise<void>
}

/** Unlike given record as current logged-in user */
export async function unlikeRecord(owner: string, name: string) {
    return client.delete(buildRecordUrl(owner, name, '/liking')) as Promise<void>
}