import { client } from './common'

/**
 * Douyin H5 share configuration data returned by the API
 */
export type DouyinH5ConfigData = {
  /** Douyin Client Key */
  clientKey: string
  /** Random nonce string for signature */
  nonceStr: string
  /** Timestamp for signature */
  timestamp: string
  /** MD5 signature for H5 share */
  signature: string
}

export async function getDouyinH5Config(signal?: AbortSignal): Promise<DouyinH5ConfigData> {
  return client.get('/douyin/h5-config', { signal })
}
