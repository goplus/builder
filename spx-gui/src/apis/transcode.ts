import { client } from './common'

// 提交转码任务的参数
export interface SubmitTranscodeParams {
  sourceUrl: string // 原始文件的 kodo URL
}

// 提交转码任务的响应
export interface SubmitTranscodeResponse {
  taskId: string            // 转码任务 ID
  expectedOutputUrl: string // 预期的输出文件 URL
}

// 转码状态
export type TranscodeStatus = 'processing' | 'completed' | 'failed'

// 查询转码状态的响应
export interface TranscodeStatusResponse {
  status: TranscodeStatus
  outputUrl?: string // 转码后的文件 URL (完成后才有)
  error?: string     // 错误信息 (失败时才有)
}

/**
 * 提交视频转码任务
 */
export async function submitTranscode(params: SubmitTranscodeParams): Promise<SubmitTranscodeResponse> {
  return client.post('/transcode/submit', params)
}

/**
 * 查询转码状态
 */
export async function getTranscodeStatus(taskId: string): Promise<TranscodeStatusResponse> {
  return client.get(`/transcode/status/${taskId}`)
}