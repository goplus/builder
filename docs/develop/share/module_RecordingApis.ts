import type { ByPage, PaginationParams } from '../../../spx-gui/src/apis/common'

/**
 * Recording data structure returned by the API
 */
export type RecordingData = {
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
    /** URL of the recordinged video file */
    videoUrl: string
    /** URL of the thumbnail image */
    thumbnailUrl: string
    /** Number of times the recording has been viewed */
    viewCount: number
    /** Number of likes the recording has received */
    likeCount: number
}

/**
 * Parameters for creating a new recording
 */
export type CreateRecordingParams = {
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

/**
 * Parameters for updating an existing recording
 */
export type UpdateRecordingParams = Partial<Pick<RecordingData, 'title' | 'description'>>

/**
 * Parameters for listing recordings with filtering and pagination
 */
export type ListRecordingParams = PaginationParams & {
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

/**
 * Recording management interface
 * Provides CRUD operations for recordings
 */
export interface RecordingService {
    /** Create a new recording */
    createRecording(params: CreateRecordingParams, signal?: AbortSignal): Promise<RecordingData>
    
    /** Get a specific recording by ID */
    getRecording(id: string, signal?: AbortSignal): Promise<RecordingData>
    
    /** Update an existing recording */
    updateRecording(id: string, params: UpdateRecordingParams, signal?: AbortSignal): Promise<RecordingData>
    
    /** Delete a recording */
    deleteRecording(id: string): Promise<void>
    
    /** List recordings with filtering and pagination */
    listRecording(params?: ListRecordingParams): Promise<ByPage<RecordingData>>
}

/**
 * Recording interaction interface
 * Provides social features like views and likes
 */
export interface RecordingInteractionService {
    /** Recording a view for the specified recording */
    recordRecordingView(id: string): Promise<void>
    
    /** Check if current user has liked the recording */
    isLikingRecording(id: string): Promise<boolean>
    
    /** Like the recording */
    likeRecording(id: string): Promise<void>
    
    /** Unlike the recording */
    unlikeRecording(id: string): Promise<void>
}