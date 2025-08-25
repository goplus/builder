/**
 * Record Module Implementation
 * 
 * This file contains the concrete implementation of the Record module interfaces.
 * It provides the actual business logic and API integration.
 */

import { client, ownerAll, Visibility } from '../../../spx-gui/src/apis/common'
import { ApiException, ApiExceptionCode } from '../../../spx-gui/src/apis/common/exception'
import type { ByPage } from '../../../spx-gui/src/apis/common'
import type {
    RecordData,
    CreateRecordParams,
    UpdateRecordParams,
    ListRecordParams,
    RecordService,
    RecordInteractionService
} from './module_RecordingApis'

class RecordServiceImpl implements RecordService {
    async createRecord(params: CreateRecordParams, signal?: AbortSignal): Promise<RecordData> {
        return client.post('/records', params, { signal }) as Promise<RecordData>
    }

    async getRecord(id: string, signal?: AbortSignal): Promise<RecordData> {
        return client.get(`/record/${id}`, undefined, { signal }) as Promise<RecordData>
    }

    async updateRecord(id: string, params: UpdateRecordParams, signal?: AbortSignal): Promise<RecordData> {
        return client.put(`/record/${id}`, params, { signal }) as Promise<RecordData>
    }

    async deleteRecord(id: string): Promise<void> {
        return client.delete(`/record/${id}`) as Promise<void>
    }

    async listRecord(params?: ListRecordParams): Promise<ByPage<RecordData>> {
        return client.get('/records/list', params) as Promise<ByPage<RecordData>>
    }
}

class RecordInteractionServiceImpl implements RecordInteractionService {
    async recordRecordView(id: string): Promise<void> {
        return client.post(`/record/${id}/view`) as Promise<void>
    }

    async isLikingRecord(id: string): Promise<boolean> {
        try {
            await client.get(`/record/${id}/liking`)
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

    async likeRecord(id: string): Promise<void> {
        return client.post(`/record/${id}/liking`) as Promise<void>
    }

    async unlikeRecord(id: string): Promise<void> {
        return client.delete(`/record/${id}/liking`) as Promise<void>
    }
}

const recordService = new RecordServiceImpl()
const recordInteractionService = new RecordInteractionServiceImpl()

// Record Service functions
export const createRecord = recordService.createRecord.bind(recordService)
export const getRecord = recordService.getRecord.bind(recordService)
export const updateRecord = recordService.updateRecord.bind(recordService)
export const deleteRecord = recordService.deleteRecord.bind(recordService)
export const listRecord = recordService.listRecord.bind(recordService)

// Record Interaction Service functions
export const recordRecordView = recordInteractionService.recordRecordView.bind(recordInteractionService)
export const isLikingRecord = recordInteractionService.isLikingRecord.bind(recordInteractionService)
export const likeRecord = recordInteractionService.likeRecord.bind(recordInteractionService)
export const unlikeRecord = recordInteractionService.unlikeRecord.bind(recordInteractionService)

/**
 * Get the record service instance
 */
export function getRecordService(): RecordService {
    return recordService
}

/**
 * Get the record interaction service instance
 */
export function getRecordInteractionService(): RecordInteractionService {
    return recordInteractionService
}

export type {
    RecordData,
    CreateRecordParams,
    UpdateRecordParams,
    ListRecordParams
} from './module_RecordingApis'

export { Visibility, ownerAll }