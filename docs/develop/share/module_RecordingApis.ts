import type { ByPage, PaginationParams } from '../../../spx-gui/src/apis/common'

/**
 * Record data structure returned by the API
 */
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

/**
 * Parameters for creating a new record
 */
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

/**
 * Parameters for updating an existing record
 */
export type UpdateRecordParams = Partial<Pick<RecordData, 'title' | 'description'>>

/**
 * Parameters for listing records with filtering and pagination
 */
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

/**
 * Record management interface
 * Provides CRUD operations for records
 */
export interface RecordService {
    /** Create a new record */
    createRecord(params: CreateRecordParams, signal?: AbortSignal): Promise<RecordData>
    
    /** Get a specific record by ID */
    getRecord(id: string, signal?: AbortSignal): Promise<RecordData>
    
    /** Update an existing record */
    updateRecord(id: string, params: UpdateRecordParams, signal?: AbortSignal): Promise<RecordData>
    
    /** Delete a record */
    deleteRecord(id: string): Promise<void>
    
    /** List records with filtering and pagination */
    listRecord(params?: ListRecordParams): Promise<ByPage<RecordData>>
}

/**
 * Record interaction interface
 * Provides social features like views and likes
 */
export interface RecordInteractionService {
    /** Record a view for the specified record */
    recordRecordView(id: string): Promise<void>
    
    /** Check if current user has liked the record */
    isLikingRecord(id: string): Promise<boolean>
    
    /** Like the record */
    likeRecord(id: string): Promise<void>
    
    /** Unlike the record */
    unlikeRecord(id: string): Promise<void>
}