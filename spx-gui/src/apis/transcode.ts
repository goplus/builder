import { client } from './common'

// Parameters for submitting transcoding task
export interface SubmitTranscodeParams {
  sourceUrl: string // Original file's kodo URL
}

// Response for submitting transcoding task
export interface SubmitTranscodeResponse {
  taskId: string // Transcoding task ID
  expectedOutputUrl: string // Expected output file URL
}

// Transcoding status
export type TranscodeStatus = 'processing' | 'completed' | 'failed'

// Response for querying transcoding status
export interface TranscodeStatusResponse {
  status: TranscodeStatus
  outputUrl?: string // Transcoded file URL (only available when completed)
  error?: string // Error message (only available when failed)
}

/**
 * Submit video transcoding task
 */
export async function submitTranscode(params: SubmitTranscodeParams): Promise<SubmitTranscodeResponse> {
  return client.post('/transcode/submit', params)
}

/**
 * Query transcoding status
 */
export async function getTranscodeStatus(taskId: string): Promise<TranscodeStatusResponse> {
  return client.get(`/transcode/status/${taskId}`)
}
