import { client } from './common'

export interface RecordTrafficSourceParams {
  platform: 'wechat' | 'qq' | 'douyin' | 'xiaohongshu' | 'bilibili'
}

/**
 * Record traffic source for analytics
 */
export async function recordTrafficSource(params: RecordTrafficSourceParams) {
  return await client.post(`/analytics/traffic-source`, params)
}
