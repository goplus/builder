import { client } from './common'
export type TrafficSourceData = {
  id: string
  createdAt: string
  updatedAt: string
  platform: string
  ipAddress: string
  accessCount: number
}
export function createTrafficSource(platform: string, signal?: AbortSignal): Promise<TrafficSourceData> {
  return client.post('/analyze/traffic-source', { platform }, { signal }) as Promise<TrafficSourceData>
}
export function recordTrafficAccess(id: string, signal?: AbortSignal): Promise<void> {
  return client.post(`/analyze/traffic-source/${id}/access`, { signal }) as Promise<void>
}
