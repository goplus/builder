import { client } from './common'

export type TrafficSourceData = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Source platform */
  platform: string
  /** Number of times this traffic source has been accessed */
  accessCount: number
}

/**
 * Create a new traffic source recording for sharing analytics
 */
export async function createTrafficSource(platform: string): Promise<TrafficSourceData> {
  return client.post(`/analytics/traffic-source`, platform)
}

/**
 * Record an access to existing traffic source
 */
export async function recordTrafficAccess(trafficSourceId: string): Promise<void> {
  return client.post(`/analytics/traffic-access`, trafficSourceId) as Promise<void>
}
