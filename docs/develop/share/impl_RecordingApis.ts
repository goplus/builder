/**
 * Recording Module Implementation
 * 
 * This file contains the concrete implementation of the Recording module interfaces.
 * It provides the actual business logic and API integration.
 */

import { client, ownerAll, Visibility } from '../../../spx-gui/src/apis/common'
import { ApiException, ApiExceptionCode } from '../../../spx-gui/src/apis/common/exception'
import type { ByPage } from '../../../spx-gui/src/apis/common'
import type {
    RecordingData,
    CreateRecordingParams,
    UpdateRecordingParams,
    ListRecordingParams,
    RecordingService,
    RecordingInteractionService
} from './module_RecordingApis'

class RecordingServiceImpl implements RecordingService {
    async createRecording(params: CreateRecordingParams, signal?: AbortSignal): Promise<RecordingData> {
        return client.post('/recordings', params, { signal }) as Promise<RecordingData>
    }

    async getRecording(id: string, signal?: AbortSignal): Promise<RecordingData> {
        return client.get(`/recording/${id}`, undefined, { signal }) as Promise<RecordingData>
    }

    async updateRecording(id: string, params: UpdateRecordingParams, signal?: AbortSignal): Promise<RecordingData> {
        return client.put(`/recording/${id}`, params, { signal }) as Promise<RecordingData>
    }

    async deleteRecording(id: string): Promise<void> {
        return client.delete(`/recording/${id}`) as Promise<void>
    }

    async listRecording(params?: ListRecordingParams): Promise<ByPage<RecordingData>> {
        return client.get('/recordings/list', params) as Promise<ByPage<RecordingData>>
    }
}

class RecordingInteractionServiceImpl implements RecordingInteractionService {
    async recordRecordingView(id: string): Promise<void> {
        return client.post(`/recording/${id}/view`) as Promise<void>
    }

    async isLikingRecording(id: string): Promise<boolean> {
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

    async likeRecording(id: string): Promise<void> {
        return client.post(`/recording/${id}/liking`) as Promise<void>
    }

    async unlikeRecording(id: string): Promise<void> {
        return client.delete(`/recording/${id}/liking`) as Promise<void>
    }
}

const recordingService = new RecordingServiceImpl()
const recordingInteractionService = new RecordingInteractionServiceImpl()

// Recording Service functions
export const createRecording = recordingService.createRecording.bind(recordingService)
export const getRecording = recordingService.getRecording.bind(recordingService)
export const updateRecording = recordingService.updateRecording.bind(recordingService)
export const deleteRecording = recordingService.deleteRecording.bind(recordingService)
export const listRecording = recordingService.listRecording.bind(recordingService)

// Recording Interaction Service functions
export const recordRecordingView = recordingInteractionService.recordRecordingView.bind(recordingInteractionService)
export const isLikingRecording = recordingInteractionService.isLikingRecording.bind(recordingInteractionService)
export const likeRecording = recordingInteractionService.likeRecording.bind(recordingInteractionService)
export const unlikeRecording = recordingInteractionService.unlikeRecording.bind(recordingInteractionService)

/**
 * Get the recording service instance
 */
export function getRecordingService(): RecordingService {
    return recordingService
}

/**
 * Get the recording interaction service instance
 */
export function getRecordingInteractionService(): RecordingInteractionService {
    return recordingInteractionService
}

export type {
    RecordingData,
    CreateRecordingParams,
    UpdateRecordingParams,
    ListRecordingParams
} from './module_RecordingApis'

export { Visibility, ownerAll }